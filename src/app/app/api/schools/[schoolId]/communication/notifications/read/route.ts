import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { markNotificationRead } from "@/domain/communication/notifications";

const schema = z.object({ notificationId: z.string().uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    await requireSchoolModule(schoolId, "COMMUNICATION");
    const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.VIEW_STUDENTS);
    const input = schema.parse(await request.json());
    const updated = await markNotificationRead(schoolId, membership.id, input.notificationId);
    if (!updated) return NextResponse.json({ error: "NOTIFICATION_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "REQUEST_FAILED" }, { status: 400 });
  }
}
