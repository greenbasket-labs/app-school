import { db } from "@/lib/db";

export type GuardianNotificationPreference = {
  inAppEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
};

export async function listParentNotifications(schoolId: string, userId: string) {
  return db.$queryRaw<Array<{ id: string; title: string; body: string; createdAt: Date; readAt: Date | null; senderEmail: string }>>`
    SELECT n."id", n."title", n."body", n."createdAt", gnr."readAt", u."email" AS "senderEmail"
    FROM "GuardianNotificationRecipient" gnr
    JOIN "Notification" n ON n."id" = gnr."notificationId"
    JOIN "User" u ON u."id" = n."createdByUserId"
    JOIN "Guardian" g ON g."id" = gnr."guardianId"
    WHERE gnr."schoolId" = ${schoolId}::uuid
      AND g."schoolId" = ${schoolId}::uuid
      AND g."userId" = ${userId}::uuid
      AND g."accountVerifiedAt" IS NOT NULL
    ORDER BY n."createdAt" DESC LIMIT 100
  `;
}

export async function markParentNotificationRead(schoolId: string, userId: string, notificationId: string) {
  const result = await db.$executeRaw`
    UPDATE "GuardianNotificationRecipient" gnr
    SET "readAt" = COALESCE(gnr."readAt", now())
    FROM "Guardian" g
    WHERE gnr."notificationId" = ${notificationId}::uuid
      AND gnr."schoolId" = ${schoolId}::uuid
      AND gnr."guardianId" = g."id"
      AND g."schoolId" = ${schoolId}::uuid
      AND g."userId" = ${userId}::uuid
      AND g."accountVerifiedAt" IS NOT NULL
  `;
  return result > 0;
}

export async function getGuardianNotificationPreference(schoolId: string, userId: string): Promise<GuardianNotificationPreference> {
  const rows = await db.$queryRaw<GuardianNotificationPreference[]>`
    SELECT p."inAppEnabled", p."smsEnabled", p."emailEnabled", p."whatsappEnabled"
    FROM "GuardianNotificationPreference" p
    JOIN "Guardian" g ON g."id" = p."guardianId" AND g."schoolId" = p."schoolId"
    WHERE p."schoolId" = ${schoolId}::uuid
      AND g."userId" = ${userId}::uuid
      AND g."accountVerifiedAt" IS NOT NULL
    ORDER BY p."updatedAt" DESC LIMIT 1
  `;
  return rows[0] ?? { inAppEnabled: true, smsEnabled: false, emailEnabled: false, whatsappEnabled: false };
}

export async function setGuardianNotificationPreference(schoolId: string, userId: string, preference: GuardianNotificationPreference) {
  const guardians = await db.guardian.findMany({
    where: { schoolId, userId, accountVerifiedAt: { not: null } },
    select: { id: true },
  });
  if (guardians.length === 0) throw new Error("VERIFIED_GUARDIAN_REQUIRED");
  await db.$transaction(async (tx) => {
    for (const guardian of guardians) {
      await tx.$executeRaw`
        INSERT INTO "GuardianNotificationPreference"
          ("schoolId", "guardianId", "inAppEnabled", "smsEnabled", "emailEnabled", "whatsappEnabled")
        VALUES
          (${schoolId}::uuid, ${guardian.id}::uuid, ${preference.inAppEnabled}, ${preference.smsEnabled}, ${preference.emailEnabled}, ${preference.whatsappEnabled})
        ON CONFLICT ("schoolId", "guardianId") DO UPDATE SET
          "inAppEnabled" = EXCLUDED."inAppEnabled",
          "smsEnabled" = EXCLUDED."smsEnabled",
          "emailEnabled" = EXCLUDED."emailEnabled",
          "whatsappEnabled" = EXCLUDED."whatsappEnabled",
          "updatedAt" = now()
      `;
    }
  });
}

export async function deliverPublishedResultToGuardians(
  schoolId: string,
  assessmentId: string,
  notificationId: string,
) {
  const guardians = await db.$queryRaw<Array<{ guardianId: string }>>`
    SELECT DISTINCT g."id" AS "guardianId"
    FROM "AssessmentScore" score
    JOIN "StudentGuardian" sg ON sg."studentId" = score."studentId" AND sg."schoolId" = score."schoolId"
    JOIN "Guardian" g ON g."id" = sg."guardianId" AND g."schoolId" = score."schoolId"
      AND g."accountVerifiedAt" IS NOT NULL AND g."userId" IS NOT NULL
    LEFT JOIN "GuardianNotificationPreference" p ON p."schoolId" = g."schoolId" AND p."guardianId" = g."id"
    WHERE score."schoolId" = ${schoolId}::uuid
      AND score."assessmentId" = ${assessmentId}::uuid
      AND COALESCE(p."inAppEnabled", true) = true
  `;
  if (!guardians.length) return 0;

  const inserted = await db.$executeRaw`
    INSERT INTO "GuardianNotificationRecipient" ("notificationId", "schoolId", "guardianId")
    SELECT ${notificationId}::uuid, g."schoolId", g."id"
    FROM "Guardian" g
    LEFT JOIN "GuardianNotificationPreference" p
      ON p."schoolId" = g."schoolId" AND p."guardianId" = g."id"
    WHERE g."id" IN (${(await Promise.all(guardians.map(async ({ guardianId }) => guardianId))).join(",") ? "NULL" : "NULL"})
  `;
  return Number(inserted);
}
