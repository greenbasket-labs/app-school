import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "bcryptjs";
import { db } from "@/lib/db";

export type GuardianAccountSecurityState = {
  guardianId: string;
  userId: string;
  mustChangePassword: boolean;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function requirePassword(password: string, name: string) {
  if (password.length < 12 || password.length > 128) {
    throw new Error(`${name} must be between 12 and 128 characters.`);
  }
}

export async function createGuardianAccountSecurity(input: {
  guardianId: string;
  userId: string;
  emailVerifiedAt?: Date | null;
}) {
  await db.$executeRaw`
    INSERT INTO "GuardianAccountSecurity" ("guardianId", "userId", "mustChangePassword", "emailVerifiedAt")
    VALUES (${input.guardianId}::uuid, ${input.userId}::uuid, true, ${input.emailVerifiedAt ?? null})
    ON CONFLICT ("guardianId") DO UPDATE SET
      "userId" = EXCLUDED."userId",
      "updatedAt" = now()
  `;
}

export async function getGuardianAccountSecurityByUserId(userId: string): Promise<GuardianAccountSecurityState | null> {
  const rows = await db.$queryRaw<GuardianAccountSecurityState[]>`
    SELECT "guardianId", "userId", "mustChangePassword", "emailVerifiedAt", "phoneVerifiedAt"
    FROM "GuardianAccountSecurity"
    WHERE "userId" = ${userId}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function changeGuardianFirstLoginPassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}) {
  requirePassword(input.newPassword, "New password");
  if (input.currentPassword === input.newPassword) throw new Error("New password must differ from the current password.");

  const security = await getGuardianAccountSecurityByUserId(input.userId);
  if (!security) throw new Error("Guardian account security record not found.");
  if (!security.mustChangePassword) throw new Error("First-login password change is not required.");

  const user = await db.user.findUnique({ where: { id: input.userId }, select: { passwordHash: true } });
  if (!user || !(await verify(input.currentPassword, user.passwordHash))) {
    throw new Error("Current password is incorrect.");
  }

  const passwordHash = await hash(input.newPassword, 12);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: input.userId }, data: { passwordHash } });
    await tx.$executeRaw`
      UPDATE "GuardianAccountSecurity"
      SET "mustChangePassword" = false, "updatedAt" = now()
      WHERE "userId" = ${input.userId}::uuid
    `;
  });
}

export async function markGuardianEmailVerified(userId: string) {
  const result = await db.$executeRaw`
    UPDATE "GuardianAccountSecurity"
    SET "emailVerifiedAt" = COALESCE("emailVerifiedAt", now()), "updatedAt" = now()
    WHERE "userId" = ${userId}::uuid
  `;
  if (result === 0) throw new Error("Guardian account security record not found.");
}

export async function markGuardianPhoneVerified(userId: string) {
  const result = await db.$executeRaw`
    UPDATE "GuardianAccountSecurity"
    SET "phoneVerifiedAt" = COALESCE("phoneVerifiedAt", now()), "updatedAt" = now()
    WHERE "userId" = ${userId}::uuid
  `;
  if (result === 0) throw new Error("Guardian account security record not found.");
}

export async function createGuardianPhoneVerificationToken(userId: string) {
  const security = await getGuardianAccountSecurityByUserId(userId);
  if (!security) throw new Error("Guardian account security record not found.");
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.$executeRaw`
    CREATE TABLE IF NOT EXISTS "GuardianPhoneVerificationToken" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "tokenHash" TEXT NOT NULL UNIQUE,
      "expiresAt" TIMESTAMPTZ(6) NOT NULL,
      "usedAt" TIMESTAMPTZ(6),
      "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
    )
  `;
  await db.$executeRaw`
    INSERT INTO "GuardianPhoneVerificationToken" ("userId", "tokenHash", "expiresAt")
    VALUES (${userId}::uuid, ${tokenHash}, ${expiresAt})
  `;
  return token;
}

export async function verifyGuardianPhoneToken(userId: string, token: string) {
  const tokenHash = hashToken(token);
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "GuardianPhoneVerificationToken"
    WHERE "userId" = ${userId}::uuid
      AND "tokenHash" = ${tokenHash}
      AND "usedAt" IS NULL
      AND "expiresAt" > now()
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) throw new Error("Phone verification token is invalid or expired.");

  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "GuardianPhoneVerificationToken" SET "usedAt" = now() WHERE "id" = ${row.id}::uuid
    `;
    await tx.$executeRaw`
      UPDATE "GuardianAccountSecurity"
      SET "phoneVerifiedAt" = COALESCE("phoneVerifiedAt", now()), "updatedAt" = now()
      WHERE "userId" = ${userId}::uuid
    `;
  });
}
