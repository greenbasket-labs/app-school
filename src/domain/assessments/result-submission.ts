import { db } from "@/lib/db";
import { validateAssessmentScores } from "@/domain/assessments/score-validation";

export class ResultSubmissionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResultSubmissionValidationError";
  }
}

export async function submitAssessmentResult(schoolId: string, assessmentId: string, submittedByUserId: string) {
  const validation = await validateAssessmentScores(schoolId, assessmentId);
  if (!validation.valid) {
    throw new ResultSubmissionValidationError(
      `Assessment cannot be submitted: ${validation.missingCount} missing and ${validation.invalidCount} invalid scores remain across ${validation.rosterCount} active students.`,
    );
  }

  const assessment = await db.assessmentDefinition.findFirst({
    where: { id: assessmentId, schoolId },
    select: { id: true, name: true },
  });
  if (!assessment) throw new ResultSubmissionValidationError("Assessment does not belong to this school.");

  const existing = await db.auditEvent.findFirst({
    where: { schoolId, entityType: "AssessmentDefinition", entityId: assessmentId, action: "assessment.result_submitted" },
    select: { id: true },
  });
  if (existing) throw new ResultSubmissionValidationError("This assessment result has already been submitted.");

  return db.auditEvent.create({
    data: {
      schoolId,
      actorUserId: submittedByUserId,
      action: "assessment.result_submitted",
      entityType: "AssessmentDefinition",
      entityId: assessmentId,
      previousState: { status: "DRAFT" },
      currentState: { status: "SUBMITTED", assessmentName: assessment.name },
    },
  });
}
