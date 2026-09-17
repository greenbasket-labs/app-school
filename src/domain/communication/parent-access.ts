import { createHash, randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function listGuardiansForAccess(schoolId: string) {
  return db.$queryRaw<Array<{
    id: string;
    fullName: string;
    email: string | null;
    hasAccount: boolean;
    accountVerified: boolean;
  }>>`
    SELECT g."id", g."fullName", g."email",
      (g."userId" IS NOT NULL) AS "hasAccount",
      (g."accountVerifiedAt" IS NOT NULL) AS "accountVerified"
    FROM "Guardian" g
    WHERE g."schoolId" = ${schoolId}::uuid
    ORDER BY g."fullName" ASC
  `;
}

export async function createParentAccessInvitation(
  schoolId: string,
  guardianId: string,
  actorUserId: string,
) {
  const guardian = await db.$queryRaw<Array<{
    id: string;
    email: string | null;
    userId: string | null;
    accountVerifiedAt: Date | null;
  }>>`
    SELECT g."id", g."email", g."userId", g."accountVerifiedAt"
    FROM "Guardian" g
    WHERE g."id" = ${guardianId}::uuid AND g."schoolId" = ${schoolId}::uuid
    LIMIT 1
  `;
  const row = guardian[0];
  if (!row) throw new Error("Guardian not found in this school.");
  if (!row.email) throw new Error("Guardian email is required before parent access can be created.");
  if (row.userId || row.accountVerifiedAt) throw new Error("This guardian already has an account relationship.");

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.$executeRaw`
    UPDATE "ParentAccessInvitation"
    SET "usedAt" = COALESCE("usedAt", now())
    WHERE "schoolId" = ${schoolId}::uuid
      AND "guardianId" = ${guardianId}::uuid
      AND "usedAt" IS NULL
  `;

  await db.$executeRaw`
    INSERT INTO "ParentAccessInvitation" ("schoolId", "guardianId", "tokenHash", "expiresAt", "createdByUserId")
    VALUES (${schoolId}::uuid, ${guardianId}::uuid, ${tokenHash(token)}, ${expiresAt}, ${actorUserId}::uuid)
  `;

  return token;
}

export async function acceptParentAccessInvitation(token: string, password: string) {
  if (password.length < 12) throw new Error("Password must be at least 12 characters.");
  const rows = await db.$queryRaw<Array<{
    id: string;
    schoolId: string;
    guardianId: string;
    guardianName: string;
    email: string;
  }>>`
    SELECT i."id", i."schoolId", i."guardianId", g."fullName" AS "guardianName", g."email"
    FROM "ParentAccessInvitation" i
    JOIN "Guardian" g ON g."id" = i."guardianId"
    WHERE i."tokenHash" = ${tokenHash(token)}
      AND i."usedAt" IS NULL
      AND i."expiresAt" > now()
      AND g."schoolId" = i."schoolId"
      AND g."userId" IS NULL
      AND g."accountVerifiedAt" IS NULL
    LIMIT 1
  `;
  const invite = rows[0];
  if (!invite) throw new Error("This parent access invitation is invalid or expired.");

  const existingUser = await db.user.findUnique({ where: { email: invite.email }, select: { id: true } });
  if (existingUser) throw new Error("An account already exists for this email. Sign in to your existing SkulGo account and ask the school to verify the guardian relationship.");
  const passwordHash = await hash(password, 12);

  return db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: invite.email, passwordHash }, select: { id: true, email: true } });
    await tx.$executeRaw`
      UPDATE "Guardian"
      SET "userId" = ${user.id}::uuid, "updatedAt" = now()
      WHERE "id" = ${invite.guardianId}::uuid AND "schoolId" = ${invite.schoolId}::uuid
    `;
    await tx.$executeRaw`
      UPDATE "ParentAccessInvitation"
      SET "usedAt" = now()
      WHERE "id" = ${invite.id}::uuid
    `;
    await tx.auditEvent.create({
      data: {
        schoolId: invite.schoolId,
        actorUserId: user.id,
        action: "communication.parent_account_created",
        entityType: "Guardian",
        entityId: invite.guardianId,
        currentState: { email: user.email, accountLinked: true, accountVerifiedAt: null },
      },
    });
    return { userId: user.id, schoolId: invite.schoolId, verificationRequired: true };
  });
}
