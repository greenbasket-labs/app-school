import { NextResponse } from "next/server";
import { currentSession } from "@/domain/auth/session-cookie";
import { getSchoolSubscription } from "@/domain/commercial/subscription";

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { schoolId } = await params;
  const { db } = await import("@/lib/db");
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!membership) return NextResponse.json({ error: "SCHOOL_ACCESS_REQUIRED" }, { status: 403 });

  const subscription = await getSchoolSubscription(schoolId);
  return NextResponse.json({ subscription });
}
