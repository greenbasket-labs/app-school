import { NextResponse } from "next/server";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireCapability, AuthorizationError } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { getSchoolSetupReadiness } from "@/domain/academic/setup-readiness";

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    const session = await currentSession();
    if (!session) throw new AuthorizationError("Authentication required.");
    const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.MANAGE_SCHOOL);
    const readiness = await getSchoolSetupReadiness(membership.schoolId);
    return NextResponse.json({ ok: true, readiness });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    }
    console.error("setup readiness request failed", error);
    return NextResponse.json({ ok: false, error: "SETUP_READINESS_FAILED" }, { status: 500 });
  }
}
