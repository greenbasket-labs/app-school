import { NextResponse } from "next/server";
import { currentSession } from "@/domain/auth/session-cookie";
import { listVerifiedGuardianChildren } from "@/domain/guardians/account-access";

export async function GET(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  const schoolId = new URL(request.url).searchParams.get("schoolId");
  if (!schoolId) return NextResponse.json({ ok: false, error: "SCHOOL_ID_REQUIRED" }, { status: 400 });

  try {
    const children = await listVerifiedGuardianChildren(schoolId, session.user.id);
    return NextResponse.json({ ok: true, schoolId, children });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "PARENT_ACCESS_DENIED" }, { status: 403 });
  }
}
