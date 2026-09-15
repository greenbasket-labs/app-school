import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const NOTIFICATION_CHANNELS = ["IN_APP", "SMS", "EMAIL", "WHATSAPP"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export type NotificationPreference = {
  inAppEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
};

export async function listSchoolRecipients(schoolId: string) {
  return db.membership.findMany({
    where: { schoolId, status: "ACTIVE" },
    select: { id: true, userId: true, isOwner: true, user: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function listInAppNotifications(schoolId: string, membershipId: string) {
  return db.$queryRaw<Array<{ id: string; title: string; body: string; createdAt: Date; readAt: Date | null; senderEmail: string }>>`
    SELECT n."id", n."title", n."body", n."createdAt", nr."readAt", u."email" AS "senderEmail"
    FROM "NotificationRecipient" nr
    JOIN "Notification" n ON n."id" = nr."notificationId"
    JOIN "User" u ON u."id" = n."createdByUserId"
    WHERE n."schoolId" = ${schoolId}::uuid AND nr."membershipId" = ${membershipId}::uuid
    ORDER BY n."createdAt" DESC LIMIT 100
  `;
}

export async function createNotification(schoolId: string, actorUserId: string, title: string, body: string, membershipIds: string[]) {
  const cleanTitle = title.trim();
  const cleanBody = body.trim();
  const uniqueIds = [...new Set(membershipIds)];
  if (!cleanTitle || !cleanBody) throw new Error("Title and message are required.");
  if (uniqueIds.length === 0) throw new Error("Select at least one recipient.");

  const recipients = await db.membership.findMany({
    where: { id: { in: uniqueIds }, schoolId, status: "ACTIVE" },
    select: { id: true },
  });
  if (recipients.length !== uniqueIds.length) throw new Error("One or more recipients are not active members of this school.");

  return db.$transaction(async (tx) => {
    const notification = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "Notification" ("schoolId", "title", "body", "createdByUserId")
      VALUES (${schoolId}::uuid, ${cleanTitle}, ${cleanBody}, ${actorUserId}::uuid)
      RETURNING "id"
    `;
    const notificationId = notification[0].id;
    await tx.$executeRaw`
      INSERT INTO "NotificationRecipient" ("notificationId", "membershipId")
      SELECT ${notificationId}::uuid, m."id"
      FROM "Membership" m
      LEFT JOIN "NotificationPreference" p ON p."membershipId" = m."id"
      WHERE m."id" IN (${Prisma.join(uniqueIds.map((id) => Prisma.sql`${id}::uuid`))})
        AND COALESCE(p."inAppEnabled", true) = true
    `;
    const delivered = await tx.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM "NotificationRecipient" WHERE "notificationId" = ${notificationId}::uuid
    `;
    await tx.auditEvent.create({
      data: { schoolId, actorUserId, action: "communication.notification_created", entityType: "Notification", entityId: notificationId, currentState: { title: cleanTitle, selectedRecipientCount: recipients.length, inAppRecipientCount: Number(delivered[0]?.count ?? 0) } },
    });
    return notificationId;
  });
}

export async function markNotificationRead(schoolId: string, membershipId: string, notificationId: string) {
  const result = await db.$executeRaw`
    UPDATE "NotificationRecipient" nr SET "readAt" = COALESCE("readAt", now())
    FROM "Notification" n
    WHERE nr."notificationId" = ${notificationId}::uuid AND nr."membershipId" = ${membershipId}::uuid
      AND n."id" = nr."notificationId" AND n."schoolId" = ${schoolId}::uuid
  `;
  return result > 0;
}

export async function getNotificationPreference(membershipId: string): Promise<NotificationPreference> {
  const rows = await db.$queryRaw<NotificationPreference[]>`
    SELECT "inAppEnabled", "smsEnabled", "emailEnabled", "whatsappEnabled"
    FROM "NotificationPreference" WHERE "membershipId" = ${membershipId}::uuid
  `;
  return rows[0] ?? { inAppEnabled: true, smsEnabled: false, emailEnabled: false, whatsappEnabled: false };
}

export async function setNotificationPreference(membershipId: string, preference: NotificationPreference) {
  await db.$executeRaw`
    INSERT INTO "NotificationPreference" ("membershipId", "inAppEnabled", "smsEnabled", "emailEnabled", "whatsappEnabled")
    VALUES (${membershipId}::uuid, ${preference.inAppEnabled}, ${preference.smsEnabled}, ${preference.emailEnabled}, ${preference.whatsappEnabled})
    ON CONFLICT ("membershipId") DO UPDATE SET
      "inAppEnabled" = EXCLUDED."inAppEnabled", "smsEnabled" = EXCLUDED."smsEnabled",
      "emailEnabled" = EXCLUDED."emailEnabled", "whatsappEnabled" = EXCLUDED."whatsappEnabled", "updatedAt" = now()
  `;
}
