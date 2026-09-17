import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { GuardianAccountAuthorizationError, listVerifiedGuardianChildren } from "@/domain/guardians/account-access";
import { markParentNotificationRead } from "@/domain/communication/guardian-notifications";

const schema = z.object({ schoolId: z.string().uuid(), notificationId: z.string().uuid() });

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    const input = schema.parse(await request.json());
    await requireSchoolModule(input.schoolId, "COMMUNICATION");
    await listVerifiedGuardianChildren(input.schoolId, session.user.id);
    const updated = await markParentNotificationRead(input.schoolId, session.user.id, input.notificationId);
    if (!updated) return NextResponse.json({ ok: false, error: "NOTIFICATION_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
    if (error instanceof GuardianAccountAuthorizationError) return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    console.error("parent notification read failed", error);
    return NextResponse.json({ ok: false, error: "PARENT_NOTIFICATION_READ_FAILED" }, { status: 400 });
  }
}
