import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { getAcademicHistory, AcademicHistoryValidationError } from "@/domain/assessments/academic-history";

const querySchema = z.object({ studentId: z.string().uuid() });

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const session = await currentSession();
    if (!session) throw new AuthorizationError("Authentication required.");
    const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.VIEW_STUDENTS);
    await requireSchoolModule(membership.schoolId, "ASSESSMENTS");

    const url = new URL(request.url);
    const { studentId } = querySchema.parse({ studentId: url.searchParams.get("studentId") });
    const history = await getAcademicHistory(schoolId, studentId);
    return NextResponse.json({ ok: true, history });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
    }
    if (error instanceof AcademicHistoryValidationError) {
      return NextResponse.json({ ok: false, error: "ACADEMIC_HISTORY_NOT_AVAILABLE", message: error.message }, { status: 409 });
    }
    console.error("academic history failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
