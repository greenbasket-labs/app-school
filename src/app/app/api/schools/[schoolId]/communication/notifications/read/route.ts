import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { markNotificationRead } from "@/domain/communication/notifications";
import { db } from "@/lib/db";

const schema = z.object({ notificationId: z.string().uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    await requireSchoolModule(schoolId, "COMMUNICATION");
    const membership = await db.membership.findFirst({ where: { userId: session.user.id, schoolId, status: "ACTIVE" }, select: { id: true } });
    if (!membership) return NextResponse.json({ error: "SCHOOL_MEMBERSHIP_REQUIRED" }, { status: 403 });
    const input = schema.parse(await request.json());
    const updated = await markNotificationRead(schoolId, membership.id, input.notificationId);
    if (!updated) return NextResponse.json({ error: "NOTIFICATION_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "REQUEST_FAILED" }, { status: 400 });
  }
}
