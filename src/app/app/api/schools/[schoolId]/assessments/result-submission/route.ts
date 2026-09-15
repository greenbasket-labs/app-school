import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { submitAssessmentResult, ResultSubmissionValidationError } from "@/domain/assessments/result-submission";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";

const bodySchema = z.object({ assessmentId: z.string().uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const session = await currentSession();
    if (!session) throw new AuthorizationError("Authentication required.");

    const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.SUBMIT_RESULTS);
    await requireSchoolModule(membership.schoolId, "ASSESSMENTS");

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });

    const submission = await submitAssessmentResult(schoolId, parsed.data.assessmentId, session.user.id);
    return NextResponse.json({ ok: true, submission }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    }
    if (error instanceof ResultSubmissionValidationError) {
      return NextResponse.json({ ok: false, error: "SUBMISSION_NOT_ALLOWED", message: error.message }, { status: 409 });
    }
    console.error("assessment result submission failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
