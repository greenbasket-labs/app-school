import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

export type SessionData = {
  userId?: number;
  sessionKey?: string;
};

const SESSION_COOKIE = "school_session";
const DEVICE_COOKIE = "school_device_id";

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error(
      "SESSION_SECRET is required in production. Configure it before starting the application.",
    );
  }

  return secret ?? "development-only-change-this-secret-1234567890";
}

const sessionOptions = {
  password: getSessionSecret(),

  cookieName: SESSION_COOKIE,

  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  },
};

export async function getSession() {
  const cookieStore = await cookies();

  return getIronSession<SessionData>(
    cookieStore,
    sessionOptions,
  );
}

export async function getOrCreateDeviceId() {
  const cookieStore = await cookies();

  const existing = cookieStore.get(DEVICE_COOKIE)?.value;

  if (existing) {
    return existing;
  }

  const deviceId = randomUUID();

  cookieStore.set({
    name: DEVICE_COOKIE,
    value: deviceId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });

  return deviceId;
}