import { NextResponse } from "next/server";
import { currentSession } from "@/domain/auth/session-cookie";

export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  const memberships = await session.user.memberships;
  return NextResponse.json({
    ok: true,
    user: { id: session.user.id, email: session.user.email },
    session: { id: session.id, expiresAt: session.expiresAt },
    memberships,
  });
}
