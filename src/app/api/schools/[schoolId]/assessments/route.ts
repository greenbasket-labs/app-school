import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { AssessmentDefinitionConflictError, AssessmentDefinitionValidationError, createAssessmentDefinition, getAssessmentDefinitionOptions, listAssessmentDefinitions } from "@/domain/assessments/service";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";

const schema = z.object({
  academicSessionId: z.string().uuid(),
  academicTermId: z.string().uuid(),
  classArmId: z.string().uuid(),
  subjectId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  maxScore: z.coerce.number().finite().positive().max(10000),
});

async function access(schoolId: string) {
  const session = await currentSession();
  if (!session) throw new AuthorizationError("Authentication required.");
  const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.CREATE_ASSESSMENT);
  await requireSchoolModule(membership.schoolId, "ASSESSMENTS");
  return session;
}

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    await access(schoolId);
    const [assessments, options] = await Promise.all([
      listAssessmentDefinitions(schoolId),
      getAssessmentDefinitionOptions(schoolId),
    ]);
    return NextResponse.json({ ok: true, assessments, options });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("assessment definitions query failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const session = await access(schoolId);
    const input = schema.parse(await request.json());
    const assessment = await createAssessmentDefinition({ schoolId, ...input });
    await db.auditEvent.create({
      data: {
        schoolId,
        actorUserId: session.user.id,
        action: "assessment.definition_created",
        entityType: "AssessmentDefinition",
        entityId: assessment.id,
        currentState: {
          academicSessionId: assessment.academicSessionId,
          academicTermId: assessment.academicTermId,
          classArmId: assessment.classArmId,
          subjectId: assessment.subjectId,
          name: assessment.name,
          maxScore: assessment.maxScore.toString(),
        },
      },
    });
    return NextResponse.json({ ok: true, assessment: { ...assessment, maxScore: assessment.maxScore.toNumber() } }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "INVALID_ASSESSMENT_DEFINITION", issues: error.issues }, { status: 400 });
    if (error instanceof AssessmentDefinitionConflictError) return NextResponse.json({ ok: false, error: "ASSESSMENT_EXISTS", message: error.message }, { status: 409 });
    if (error instanceof AssessmentDefinitionValidationError) return NextResponse.json({ ok: false, error: "INVALID_ASSESSMENT_DEFINITION", message: error.message }, { status: 400 });
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("assessment definition request failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
