import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { approveAssessmentResult, ResultApprovalValidationError } from "@/domain/assessments/result-approval";

const schema = z.object({ assessmentId: z.string().uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const session = await currentSession();
    if (!session) throw new AuthorizationError("Authentication required.");
    const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.APPROVE_RESULTS);
    await requireSchoolModule(membership.schoolId, "ASSESSMENTS");
    const input = schema.parse(await request.json());
    const event = await approveAssessmentResult(schoolId, input.assessmentId, session.user.id);
    return NextResponse.json({ ok: true, approval: { id: event.id, assessmentId: input.assessmentId, approvedAt: event.occurredAt } }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "INVALID_REQUEST", issues: error.issues }, { status: 400 });
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    if (error instanceof ResultApprovalValidationError) return NextResponse.json({ ok: false, error: "APPROVAL_BLOCKED", message: error.message }, { status: 400 });
    console.error("assessment result approval failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
