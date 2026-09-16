import { NextResponse } from "next/server";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { requireCapability, AuthorizationError } from "@/domain/auth/authorize";
import { currentSession } from "@/domain/auth/session-cookie";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import {
  getAcademicHistory,
  AcademicHistoryValidationError,
} from "@/domain/assessments/academic-history";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ schoolId: string; studentId: string }> },
) {
  try {
    const { schoolId, studentId } = await params;
    const session = await currentSession();
    if (!session) throw new AuthorizationError("Authentication required.");

    const membership = await requireCapability(
      session.user.id,
      schoolId,
      CAPABILITIES.VIEW_STUDENTS,
    );
    await requireSchoolModule(membership.schoolId, "ASSESSMENTS");

    const history = await getAcademicHistory(membership.schoolId, studentId);
    return NextResponse.json({ ok: true, history }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN", message: error.message },
        { status: 403 },
      );
    }
    if (error instanceof AcademicHistoryValidationError) {
      return NextResponse.json(
        { ok: false, error: "ACADEMIC_HISTORY_UNAVAILABLE", message: error.message },
        { status: 400 },
      );
    }

    console.error("academic history request failed", error);
    return NextResponse.json(
      { ok: false, error: "REQUEST_FAILED" },
      { status: 500 },
    );
  }
}
