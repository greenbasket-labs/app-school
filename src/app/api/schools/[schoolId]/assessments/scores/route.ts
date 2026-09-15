import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { getAssessmentScoreRoster, saveAssessmentScore, AssessmentScoreValidationError } from "@/domain/assessments/score-service";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";

const saveSchema = z.object({
  assessmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  score: z.coerce.number().finite().min(0),
});

async function access(schoolId: string) {
  const session = await currentSession();
  if (!session) throw new AuthorizationError("Authentication required.");
  const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.CREATE_ASSESSMENT);
  await requireSchoolModule(membership.schoolId, "ASSESSMENTS");
  return session;
}

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    await access(schoolId);
    const assessmentId = new URL(request.url).searchParams.get("assessmentId");
    if (!assessmentId) return NextResponse.json({ ok: false, error: "ASSESSMENT_REQUIRED" }, { status: 400 });
    if (!z.string().uuid().safeParse(assessmentId).success) return NextResponse.json({ ok: false, error: "INVALID_ASSESSMENT_ID" }, { status: 400 });
    return NextResponse.json({ ok: true, ...(await getAssessmentScoreRoster(schoolId, assessmentId)) });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    if (error instanceof AssessmentScoreValidationError) return NextResponse.json({ ok: false, error: "INVALID_SCORE_CONTEXT", message: error.message }, { status: 400 });
    console.error("assessment score roster failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const session = await access(schoolId);
    const input = saveSchema.parse(await request.json());
    const existing = await db.assessmentScore.findFirst({
      where: { schoolId, assessmentId: input.assessmentId, studentId: input.studentId },
      select: { id: true, score: true },
    });
    const score = await saveAssessmentScore({ schoolId, ...input });
    await db.auditEvent.create({
      data: {
        schoolId,
        actorUserId: session.user.id,
        action: existing ? "assessment.score_updated" : "assessment.score_created",
        entityType: "AssessmentScore",
        entityId: score.id,
        previousState: existing ? { score: existing.score.toString() } : undefined,
        currentState: { assessmentId: score.assessmentId, studentId: score.studentId, score: score.score.toString() },
      },
    });
    return NextResponse.json({ ok: true, score: { ...score, score: score.score.toNumber() } }, { status: existing ? 200 : 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "INVALID_SCORE", issues: error.issues }, { status: 400 });
    if (error instanceof AssessmentScoreValidationError) return NextResponse.json({ ok: false, error: "INVALID_SCORE", message: error.message }, { status: 400 });
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("assessment score save failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
