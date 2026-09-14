import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

const SESSION_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.userSession.create({
    data: { userId, tokenHash, expiresAt },
  });

  return { token, expiresAt };
}

export async function getSession(token: string) {
  const tokenHash = hashToken(token);
  const session = await db.userSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
  return session;
}

export async function revokeSession(token: string): Promise<void> {
  await db.userSession.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
