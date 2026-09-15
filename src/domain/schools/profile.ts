import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeSchoolName } from "@/domain/identity/normalize";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(200),
  address: z.string().trim().max(500).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  email: z.string().trim().email().max(320).optional().nullable(),
});

export type SchoolProfileInput = z.infer<typeof profileSchema>;

export async function getSchoolProfile(schoolId: string) {
  return db.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true, address: true, phone: true, email: true },
  });
}

export async function updateSchoolProfile(schoolId: string, userId: string, raw: SchoolProfileInput) {
  const input = profileSchema.parse(raw);
  const membership = await db.membership.findFirst({
    where: { schoolId, userId, status: "ACTIVE", isOwner: true },
    select: { id: true },
  });
  if (!membership) throw new Error("OWNER_REQUIRED");

  const current = await db.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true, address: true, phone: true, email: true },
  });
  if (!current) throw new Error("SCHOOL_NOT_FOUND");

  const updated = await db.$transaction(async (tx) => {
    const school = await tx.school.update({
      where: { id: schoolId },
      data: {
        name: input.name,
        normalizedName: normalizeSchoolName(input.name),
        address: input.address || null,
        phone: input.phone || null,
        email: input.email || null,
      },
      select: { id: true, name: true, address: true, phone: true, email: true },
    });

    await tx.auditEvent.create({
      data: {
        schoolId,
        actorUserId: userId,
        action: "school.profile.updated",
        entityType: "School",
        entityId: schoolId,
        previousState: current,
        currentState: school,
      },
    });
    return school;
  });

  return updated;
}
