import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { submitAssessmentResult, ResultSubmissionValidationError } from "@/domain/assessments/result-submission";

const schema = z.object({ assessmentId: z.string().uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const session = await currentSession();
    if (!session) throw new AuthorizationError("Authentication required.");
    const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.SUBMIT_RESULTS);
    await requireSchoolModule(membership.schoolId, "ASSESSMENTS");
    const input = schema.parse(await request.json());
    const event = await submitAssessmentResult(schoolId, input.assessmentId, session.user.id);
    return NextResponse.json({ ok: true, submission: { id: event.id, assessmentId: input.assessmentId, submittedAt: event.occurredAt } }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "INVALID_REQUEST", issues: error.issues }, { status: 400 });
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    if (error instanceof ResultSubmissionValidationError) return NextResponse.json({ ok: false, error: "SUBMISSION_BLOCKED", message: error.message }, { status: 400 });
    console.error("assessment result submission failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
