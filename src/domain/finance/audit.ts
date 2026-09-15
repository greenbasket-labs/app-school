import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function listFinanceAuditEvents(schoolId: string, limit = 100) {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  return db.$queryRaw<Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    actorUserId: string | null;
    actorName: string | null;
    previousState: unknown;
    currentState: unknown;
    metadata: unknown;
    occurredAt: Date;
  }>>(Prisma.sql`
    SELECT a."id", a."action", a."entityType", a."entityId", a."actorUserId",
      CASE WHEN u."id" IS NULL THEN NULL ELSE CONCAT_WS(' ', u."firstName", u."lastName") END AS "actorName",
      a."previousState", a."currentState", a."metadata", a."occurredAt"
    FROM "AuditEvent" a
    LEFT JOIN "User" u ON u."id" = a."actorUserId"
    WHERE a."schoolId" = ${schoolId}::uuid
      AND a."action" LIKE 'finance.%'
    ORDER BY a."occurredAt" DESC
    LIMIT ${safeLimit}
  `);
}
