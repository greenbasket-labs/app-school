import { NextResponse } from "next/server";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";

export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  const memberships = await db.membership.findMany({
    where: { userId: session.user.id, status: "ACTIVE" },
    select: {
      id: true,
      organizationId: true,
      schoolId: true,
      school: { select: { id: true, name: true, status: true, setupStatus: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    user: { id: session.user.id, email: session.user.email },
    session: { id: session.id, expiresAt: session.expiresAt },
    memberships,
  });
}
