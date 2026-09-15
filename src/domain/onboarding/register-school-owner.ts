import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { MODULE_CATALOG } from "@/domain/modules/catalog";
import { ensureOnboardingCatalogs } from "@/domain/onboarding/catalog-seeding";
import {
  normalizeCacNumber,
  normalizeEmail,
  normalizeOrganizationName,
  normalizeSchoolName,
} from "@/domain/identity/normalize";

const inputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128),
  organizationName: z.string().min(2).max(200),
  schoolName: z.string().min(2).max(200),
  cacNumber: z.string().min(4).max(64),
});
export type RegisterSchoolOwnerInput = z.infer<typeof inputSchema>;

export class RegistrationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistrationConflictError";
  }
}

export async function registerSchoolOwner(raw: RegisterSchoolOwnerInput) {
  const input = inputSchema.parse(raw);
  const email = normalizeEmail(input.email);
  const normalizedCacNumber = normalizeCacNumber(input.cacNumber);
  if (!normalizedCacNumber) throw new Error("CAC number is required.");
  const passwordHash = await hash(input.password, 12);

  try {
    const { capabilities, modules } = await ensureOnboardingCatalogs();
    const capabilityIds = new Map(capabilities.map((capability) => [capability.code, capability.id]));
    const moduleIds = new Map(modules.map((module) => [module.code, module.id]));

    return await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash },
        select: { id: true, email: true, createdAt: true },
      });
      const organization = await tx.organization.create({
        data: {
          name: input.organizationName.trim(),
          normalizedName: normalizeOrganizationName(input.organizationName),
          identity: {
            create: {
              cacNumber: input.cacNumber.trim(),
              normalizedCacNumber,
            },
          },
        },
        select: { id: true, createdAt: true },
      });
      const school = await tx.school.create({
        data: {
          organizationId: organization.id,
          name: input.schoolName.trim(),
          normalizedName: normalizeSchoolName(input.schoolName),
          setupStatus: "IDENTITY_READY",
        },
        select: { id: true, name: true, createdAt: true },
      });
      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          schoolId: school.id,
          isOwner: true,
        },
        select: { id: true },
      });

      const ownerCapabilityIds = Object.values(CAPABILITIES).map((code) => {
        const id = capabilityIds.get(code);
        if (!id) throw new Error(`Missing capability catalog entry: ${code}`);
        return id;
      });
      await tx.membershipCapability.createMany({
        data: ownerCapabilityIds.map((capabilityId) => ({
          membershipId: membership.id,
          capabilityId,
          schoolId: school.id,
        })),
      });

      const schoolModules = MODULE_CATALOG.map((moduleDefinition) => {
        const moduleId = moduleIds.get(moduleDefinition.code);
        if (!moduleId) throw new Error(`Missing module catalog entry: ${moduleDefinition.code}`);
        const enabled =
          moduleDefinition.code === "ACADEMICS" ||
          moduleDefinition.code === "STUDENTS" ||
          moduleDefinition.code === "ATTENDANCE";
        return {
          schoolId: school.id,
          moduleId,
          enabled,
          enabledAt: enabled ? school.createdAt : null,
        };
      });
      await tx.schoolModule.createMany({ data: schoolModules });

      await tx.auditEvent.create({
        data: {
          schoolId: school.id,
          actorUserId: user.id,
          action: "school.identity.created",
          entityType: "School",
          entityId: school.id,
          currentState: {
            organizationId: organization.id,
            schoolId: school.id,
            schoolName: school.name,
            schoolCreatedAt: school.createdAt.toISOString(),
            cacIdentityBound: true,
            ownerMembershipId: membership.id,
          },
        },
      });
      return { user, organization, school, membership };
    }, { maxWait: 10000, timeout: 10000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(",")
        : String(error.meta?.target ?? "");
      if (target.includes("normalizedCacNumber")) {
        throw new RegistrationConflictError(
          "This CAC identity is already registered with Green Basket Global.",
        );
      }
      if (target.includes("email")) {
        throw new RegistrationConflictError("An account already exists for this email.");
      }
    }
    throw error;
  }
}
