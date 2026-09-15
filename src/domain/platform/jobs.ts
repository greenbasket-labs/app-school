import { db } from "@/lib/db";

export async function enqueueJob(input: { schoolId?: string; type: string; payload?: unknown; idempotencyKey?: string }) {
  const rows = await db.$queryRaw<Array<{ id: string; status: string }>>`
    INSERT INTO "PlatformJob" ("schoolId", "type", "payload", "idempotencyKey")
    VALUES (${input.schoolId ?? null}, ${input.type}, ${JSON.stringify(input.payload ?? {})}::jsonb, ${input.idempotencyKey ?? null})
    ON CONFLICT ("schoolId", "type", "idempotencyKey") DO UPDATE SET "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "id", "status"`;
  return rows[0];
}

export async function claimNextJob(type?: string) {
  return db.$queryRaw<Array<{ id: string; schoolId: string | null; type: string; payload: unknown; attempts: number }>>`
    WITH candidate AS (
      SELECT "id" FROM "PlatformJob"
      WHERE "status" = 'PENDING' AND "availableAt" <= CURRENT_TIMESTAMP
        AND (${type ?? null} IS NULL OR "type" = ${type ?? null})
      ORDER BY "availableAt", "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1
    )
    UPDATE "PlatformJob" j SET "status" = 'RUNNING', "lockedAt" = CURRENT_TIMESTAMP, "attempts" = j."attempts" + 1, "updatedAt" = CURRENT_TIMESTAMP
    FROM candidate WHERE j."id" = candidate."id"
    RETURNING j."id", j."schoolId", j."type", j."payload", j."attempts"`;
}
