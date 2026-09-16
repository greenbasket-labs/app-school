import { db } from "@/lib/db";
import { normalizeEmail } from "@/domain/identity/normalize";
import { verifyPassword } from "@/domain/auth/password";

export class AuthenticationError extends Error {
  constructor(message = "Invalid email or password.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export async function authenticateUser(emailInput: string, password: string) {
  const email = normalizeEmail(emailInput);
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true, status: true },
  });

  if (!user || user.status !== "ACTIVE") throw new AuthenticationError();
  if (!(await verifyPassword(password, user.passwordHash))) throw new AuthenticationError();

  const guardianSecurity = await db.$queryRaw<Array<{ mustChangePassword: boolean }>>`
    SELECT "mustChangePassword"
    FROM "GuardianAccountSecurity"
    WHERE "userId" = ${user.id}::uuid
    LIMIT 1
  `;

  return {
    id: user.id,
    email: user.email,
    requiresFirstLoginPasswordChange: guardianSecurity[0]?.mustChangePassword ?? false,
  };
}
