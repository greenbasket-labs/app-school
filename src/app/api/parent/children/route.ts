import { NextResponse } from "next/server";
import { currentSession } from "@/domain/auth/session-cookie";
import { GuardianAccountAuthorizationError, listVerifiedGuardianChildren } from "@/domain/guardians/account-access";

export async function GET(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  const schoolId = new URL(request.url).searchParams.get("schoolId");
  if (!schoolId) return NextResponse.json({ ok: false, error: "SCHOOL_ID_REQUIRED" }, { status: 400 });

  try {
    const children = await listVerifiedGuardianChildren(schoolId, session.user.id);
    return NextResponse.json({ ok: true, schoolId, children });
  } catch (error) {
    if (error instanceof GuardianAccountAuthorizationError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    }
    console.error("parent children lookup failed", error);
    return NextResponse.json({ ok: false, error: "PARENT_CHILDREN_LOOKUP_FAILED" }, { status: 500 });
  }
}
