import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { CAPABILITIES } from "@/domain/auth/capabilities";

export class StaffAuthorizationError extends Error {}
export class StaffValidationError extends Error {}

export async function getSchoolStaff(schoolId: string) {
  return db.membership.findMany({
    where: { schoolId, status: "ACTIVE" },
    orderBy: [{ isOwner: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      userId: true,
      isOwner: true,
      status: true,
      createdAt: true,
      user: { select: { email: true, status: true } },
      capabilities: { select: { capability: { select: { code: true, description: true } } } },
    },
  });
}

async function requireOwner(tx: Prisma.TransactionClient, schoolId: string, userId: string) {
  const owner = await tx.membership.findFirst({ where: { schoolId, userId, status: "ACTIVE", isOwner: true }, select: { id: true } });
  if (!owner) throw new StaffAuthorizationError("Only the school owner can manage staff access.");
  return owner;
}

export async function createSchoolStaff(input: {
  schoolId: string;
  actorUserId: string;
  email: string;
  password: string;
  capabilityCodes: string[];
}) {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new StaffValidationError("A valid staff email is required.");
  if (input.password.length < 12) throw new StaffValidationError("Staff password must be at least 12 characters.");
  const allowedCodes = new Set(Object.values(CAPABILITIES));
  if (input.capabilityCodes.some((code) => !allowedCodes.has(code as never))) throw new StaffValidationError("Invalid capability.");
  const passwordHash = await hash(input.password, 12);

  try {
    return await db.$transaction(async (tx) => {
      const actor = await requireOwner(tx, input.schoolId, input.actorUserId);
      const school = await tx.school.findUnique({ where: { id: input.schoolId }, select: { organizationId: true } });
      if (!school) throw new StaffValidationError("School not found.");

      const user = await tx.user.create({ data: { email, passwordHash }, select: { id: true, email: true } });
      const membership = await tx.membership.create({ data: { userId: user.id, organizationId: school.organizationId, schoolId: input.schoolId }, select: { id: true } });
      const capabilities = await tx.capability.findMany({ where: { code: { in: input.capabilityCodes } }, select: { id: true, code: true } });
      if (capabilities.length !== input.capabilityCodes.length) throw new StaffValidationError("One or more capabilities are not available.");
      if (capabilities.length) {
        await tx.membershipCapability.createMany({ data: capabilities.map((capability) => ({ membershipId: membership.id, capabilityId: capability.id, schoolId: input.schoolId })) });
      }
      await tx.auditEvent.create({ data: { schoolId: input.schoolId, actorUserId: input.actorUserId, action: "staff.created", entityType: "Membership", entityId: membership.id, currentState: { userId: user.id, email: user.email, capabilityCodes: capabilities.map((item) => item.code) }, metadata: { ownerMembershipId: actor.id } } });
      return { membershipId: membership.id, userId: user.id, email: user.email, capabilityCodes: capabilities.map((item) => item.code) };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new StaffValidationError("An account already exists for this email.");
    throw error;
  }
}

export async function setStaffCapabilities(input: { schoolId: string; actorUserId: string; membershipId: string; capabilityCodes: string[] }) {
  const allowedCodes = new Set(Object.values(CAPABILITIES));
  if (input.capabilityCodes.some((code) => !allowedCodes.has(code as never))) throw new StaffValidationError("Invalid capability.");
  return db.$transaction(async (tx) => {
    await requireOwner(tx, input.schoolId, input.actorUserId);
    const membership = await tx.membership.findFirst({ where: { id: input.membershipId, schoolId: input.schoolId, status: "ACTIVE" }, select: { id: true, userId: true, isOwner: true } });
    if (!membership) throw new StaffValidationError("Active staff membership not found.");
    if (membership.isOwner) throw new StaffValidationError("Owner capabilities are managed by the owner account and cannot be edited here.");
    const capabilities = await tx.capability.findMany({ where: { code: { in: input.capabilityCodes } }, select: { id: true, code: true } });
    if (capabilities.length !== input.capabilityCodes.length) throw new StaffValidationError("One or more capabilities are not available.");
    await tx.membershipCapability.deleteMany({ where: { membershipId: membership.id } });
    if (capabilities.length) await tx.membershipCapability.createMany({ data: capabilities.map((capability) => ({ membershipId: membership.id, capabilityId: capability.id, schoolId: input.schoolId })) });
    await tx.auditEvent.create({ data: { schoolId: input.schoolId, actorUserId: input.actorUserId, action: "staff.capabilities_changed", entityType: "Membership", entityId: membership.id, currentState: { userId: membership.userId, capabilityCodes: capabilities.map((item) => item.code) } } });
    return capabilities.map((item) => item.code);
  });
}
