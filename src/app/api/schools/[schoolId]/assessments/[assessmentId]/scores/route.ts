import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { AssessmentScoreConflictError, AssessmentScoreValidationError, getAssessmentScoreRoster, saveAssessmentScore } from "@/domain/assessments/score-service";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";

const schema = z.object({
  studentId: z.string().uuid(),
  score: z.coerce.number().finite().min(0),
});

async function access(schoolId: string) {
  const session = await currentSession();
  if (!session) throw new AuthorizationError("Authentication required.");
  const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.SUBMIT_RESULTS);
  await requireSchoolModule(membership.schoolId, "ASSESSMENTS");
  return session;
}

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string; assessmentId: string }> }) {
  try {
    const { schoolId, assessmentId } = await params;
    await access(schoolId);
    return NextResponse.json({ ok: true, ...(await getAssessmentScoreRoster(schoolId, assessmentId)) });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError || error instanceof AssessmentScoreValidationError) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: error instanceof AssessmentScoreValidationError ? 404 : 403 });
    }
    console.error("assessment score roster query failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string; assessmentId: string }> }) {
  try {
    const { schoolId, assessmentId } = await params;
    const session = await access(schoolId);
    const input = schema.parse(await request.json());
    const score = await saveAssessmentScore({ schoolId, assessmentId, ...input });
    await db.auditEvent.create({
      data: {
        schoolId,
        actorUserId: session.user.id,
        action: "assessment.score_saved",
        entityType: "AssessmentScore",
        entityId: score.id,
        previousState: null,
        currentState: { assessmentId, studentId: score.studentId, score: score.score.toString() },
        metadata: { assessmentName: assessmentId },
      },
    });
    return NextResponse.json({ ok: true, score: { id: score.id, studentId: score.studentId, score: score.score.toNumber() } }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "INVALID_SCORE", issues: error.issues }, { status: 400 });
    if (error instanceof AssessmentScoreValidationError) return NextResponse.json({ ok: false, error: "INVALID_SCORE", message: error.message }, { status: 400 });
    if (error instanceof AssessmentScoreConflictError) return NextResponse.json({ ok: false, error: "SCORE_EXISTS", message: error.message }, { status: 409 });
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("assessment score request failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
