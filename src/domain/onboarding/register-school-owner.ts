import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { MODULE_CATALOG } from "@/domain/modules/catalog";
import {
  normalizeCacNumber,
  normalizeEmail,
  normalizeOrganizationName,
  normalizeSchoolName,
} from "@/domain/identity/normalize";

const inputSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(12).max(128).optional(),
  existingUserId: z.string().uuid().optional(),
  organizationName: z.string().min(2).max(200),
  schoolName: z.string().min(2).max(200),
  capacity: z.enum(["OWNER", "PRINCIPAL", "HEADMASTER"]).default("OWNER"),
  cacNumber: z.string().max(64).optional(),
}).superRefine((value, ctx) => {
  if (value.existingUserId) return;
  if (!value.email) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Email is required." });
  if (!value.password) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password"], message: "Password is required." });
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
  const normalizedCacNumber = input.cacNumber
    ? normalizeCacNumber(input.cacNumber)
    : null;

  const passwordHash = input.password ? await hash(input.password, 12) : null;

  try {
    const capabilityIds = new Map<string, string>();
    for (const [code, value] of Object.entries(CAPABILITIES)) {
      const capability = await db.capability.upsert({
        where: { code: value },
        update: {},
        create: {
          code: value,
          description: `Allows ${code.toLowerCase().replaceAll("_", " ")} actions.`,
        },
        select: { id: true },
      });
      capabilityIds.set(value, capability.id);
    }

    const moduleIds = new Map<string, string>();
    for (const moduleDefinition of MODULE_CATALOG) {
      const module = await db.module.upsert({
        where: { code: moduleDefinition.code },
        update: {
          name: moduleDefinition.name,
          description: moduleDefinition.description,
          category: moduleDefinition.category,
          sortOrder: moduleDefinition.sortOrder,
        },
        create: moduleDefinition,
        select: { id: true },
      });
      moduleIds.set(moduleDefinition.code, module.id);
    }

    return await db.$transaction(async (tx) => {
      let user;

      if (input.existingUserId) {
        user = await tx.user.findFirst({
          where: { id: input.existingUserId, status: "ACTIVE" },
          select: { id: true, email: true, createdAt: true },
        });
        if (!user) throw new RegistrationConflictError("Your SkulGo account could not be found.");
      } else {
        user = await tx.user.create({
          data: {
            email: normalizeEmail(input.email!),
            passwordHash: passwordHash!,
          },
          select: { id: true, email: true, createdAt: true },
        });
      }

      const organization = await tx.organization.create({
        data: {
          name: input.organizationName.trim(),
          normalizedName: normalizeOrganizationName(input.organizationName),
          ...(normalizedCacNumber
            ? {
                identity: {
                  create: {
                    cacNumber: input.cacNumber!.trim(),
                    normalizedCacNumber,
                  },
                },
              }
            : {}),
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
          relationship: input.capacity,
        },
        select: { id: true },
      });

      const ownerCapabilityIds = Object.values(CAPABILITIES).map((code) => capabilityIds.get(code));
      if (ownerCapabilityIds.some((id) => !id)) {
        throw new Error("Platform capability catalog is incomplete.");
      }

      await tx.membershipCapability.createMany({
        data: ownerCapabilityIds.map((capabilityId) => ({
          membershipId: membership.id,
          capabilityId: capabilityId!,
          schoolId: school.id,
        })),
      });

      for (const moduleDefinition of MODULE_CATALOG) {
        const moduleId = moduleIds.get(moduleDefinition.code);
        if (!moduleId) {
          throw new Error(`Platform module catalog is incomplete: ${moduleDefinition.code}`);
        }

        const enabledByDefault =
          moduleDefinition.code === "ACADEMICS" ||
          moduleDefinition.code === "STUDENTS" ||
          moduleDefinition.code === "ATTENDANCE";

        await tx.schoolModule.create({
          data: {
            schoolId: school.id,
            moduleId,
            enabled: enabledByDefault,
            enabledAt: enabledByDefault ? school.createdAt : null,
          },
        });
      }

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
            cacIdentityBound: Boolean(normalizedCacNumber),
            capacity: input.capacity,
            ownerMembershipId: membership.id,
            personalAccountReused: Boolean(input.existingUserId),
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
