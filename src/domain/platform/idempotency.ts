import { db } from "@/lib/db";

export async function getIdempotentResult<T>(schoolId: string, operation: string, key: string) {
  const rows = await db.$queryRaw<Array<{ result: T | null }>>`
    SELECT "result" FROM "IdempotencyRecord"
    WHERE "schoolId" = ${schoolId} AND "operation" = ${operation} AND "key" = ${key}
    LIMIT 1`;
  return rows[0]?.result ?? null;
}

export async function rememberIdempotentResult(schoolId: string, operation: string, key: string, result: unknown) {
  await db.$executeRaw`
    INSERT INTO "IdempotencyRecord" ("schoolId", "operation", "key", "result")
    VALUES (${schoolId}, ${operation}, ${key}, ${JSON.stringify(result)}::jsonb)
    ON CONFLICT ("schoolId", "key", "operation") DO NOTHING`;
}
