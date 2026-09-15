import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { approveAssessmentResult, ResultApprovalValidationError } from "@/domain/assessments/result-approval";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";

const bodySchema = z.object({ assessmentId: z.string().uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const session = await currentSession();
    if (!session) throw new AuthorizationError("Authentication required.");

    const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.APPROVE_RESULTS);
    await requireSchoolModule(membership.schoolId, "ASSESSMENTS");

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });

    const approval = await approveAssessmentResult(schoolId, parsed.data.assessmentId, session.user.id);
    return NextResponse.json({ ok: true, approval }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    }
    if (error instanceof ResultApprovalValidationError) {
      return NextResponse.json({ ok: false, error: "APPROVAL_NOT_ALLOWED", message: error.message }, { status: 409 });
    }
    console.error("assessment result approval failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
