import { NextResponse } from "next/server";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { GuardianAccountAuthorizationError, listVerifiedGuardianChildren } from "@/domain/guardians/account-access";
import { listParentNotifications } from "@/domain/communication/guardian-notifications";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  const schoolId = new URL(request.url).searchParams.get("schoolId");
  if (!schoolId) return NextResponse.json({ ok: false, error: "SCHOOL_ID_REQUIRED" }, { status: 400 });
  try {
    await requireSchoolModule(schoolId, "COMMUNICATION");
    await listVerifiedGuardianChildren(schoolId, session.user.id);
    return NextResponse.json({ ok: true, notifications: await listParentNotifications(schoolId, session.user.id) });
  } catch (error) {
    if (error instanceof GuardianAccountAuthorizationError) return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    if (error instanceof Error && error.message.includes("disabled")) return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    console.error("parent notifications lookup failed", error);
    return NextResponse.json({ ok: false, error: "PARENT_NOTIFICATIONS_LOOKUP_FAILED" }, { status: 500 });
  }
}
