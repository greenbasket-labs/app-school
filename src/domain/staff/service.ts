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

export async function setMembershipDisabled(input: {
  schoolId: string;
  actorUserId: string;
  membershipId: string;
}) {
  return db.$transaction(async (tx) => {
    const actor = await requireOwner(tx, input.schoolId, input.actorUserId);
    const membership = await tx.membership.findFirst({
      where: { id: input.membershipId, schoolId: input.schoolId },
      select: { id: true, userId: true, status: true, isOwner: true },
    });
    if (!membership) throw new StaffValidationError("School membership not found.");
    if (membership.isOwner) throw new StaffValidationError("The school owner membership cannot be disabled here.");
    if (membership.status === "ENDED") return membership;

    const updated = await tx.membership.update({
      where: { id: membership.id },
      data: { status: "ENDED" },
      select: { id: true, userId: true, status: true },
    });

    await tx.auditEvent.create({
      data: {
        schoolId: input.schoolId,
        actorUserId: input.actorUserId,
        action: "membership.disabled",
        entityType: "Membership",
        entityId: membership.id,
        previousState: { status: membership.status, userId: membership.userId },
        currentState: { status: updated.status, userId: updated.userId },
        metadata: { ownerMembershipId: actor.id },
      },
    });

    return updated;
  });
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
