import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import {
  validateAssessmentScores,
  AssessmentScoreValidationContextError,
} from "@/domain/assessments/score-validation";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";

async function access(schoolId: string) {
  const session = await currentSession();
  if (!session) throw new AuthorizationError("Authentication required.");
  const membership = await requireCapability(
    session.user.id,
    schoolId,
    CAPABILITIES.CREATE_ASSESSMENT,
  );
  await requireSchoolModule(membership.schoolId, "ASSESSMENTS");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  try {
    const schoolId = (await params).schoolId;
    await access(schoolId);

    const assessmentId = new URL(request.url).searchParams.get("assessmentId");
    const parsed = z.string().uuid().safeParse(assessmentId);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ASSESSMENT_ID" },
        { status: 400 },
      );
    }

    const validation = await validateAssessmentScores(schoolId, parsed.data);
    return NextResponse.json({ ok: true, validation });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
    }
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN", message: error.message },
        { status: 403 },
      );
    }
    if (error instanceof AssessmentScoreValidationContextError) {
      return NextResponse.json(
        { ok: false, error: "INVALID_SCORE_CONTEXT", message: error.message },
        { status: 400 },
      );
    }
    console.error("assessment score validation failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
