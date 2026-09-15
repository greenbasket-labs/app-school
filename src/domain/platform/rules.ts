import { db } from "@/lib/db";

export async function listRules(schoolId: string) {
  return db.$queryRaw<Array<{ id: string; code: string; name: string; enabled: boolean; version: number; config: unknown }>>`
    SELECT "id", "code", "name", "enabled", "version", "config"
    FROM "RuleDefinition" WHERE "schoolId" = ${schoolId} ORDER BY "code" ASC`;
}

export async function upsertRule(input: { schoolId: string; userId: string; code: string; name: string; enabled: boolean; config?: unknown }) {
  return db.$queryRaw<Array<{ id: string; code: string; enabled: boolean; version: number }>>`
    INSERT INTO "RuleDefinition" ("schoolId", "code", "name", "enabled", "config", "updatedByUserId")
    VALUES (${input.schoolId}, ${input.code.trim()}, ${input.name.trim()}, ${input.enabled}, ${JSON.stringify(input.config ?? {})}::jsonb, ${input.userId})
    ON CONFLICT ("schoolId", "code") DO UPDATE SET
      "name" = EXCLUDED."name",
      "enabled" = EXCLUDED."enabled",
      "config" = EXCLUDED."config",
      "version" = "RuleDefinition"."version" + 1,
      "updatedByUserId" = EXCLUDED."updatedByUserId",
      "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "id", "code", "enabled", "version"`;
}
