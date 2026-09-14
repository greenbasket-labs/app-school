import { cookies } from "next/headers";
import { createSession, getSession, revokeSession } from "@/domain/auth/session";

export const SESSION_COOKIE = "gb_school_session";

export async function signIn(userId: string) {
  const { token, expiresAt } = await createSession(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return expiresAt;
}

export async function currentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getSession(token) : null;
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await revokeSession(token);
  jar.delete(SESSION_COOKIE);
}
