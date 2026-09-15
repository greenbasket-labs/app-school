import { db } from "@/lib/db";

export class ResultPublicationValidationError extends Error {
  constructor(message: string) { super(message); this.name = "ResultPublicationValidationError"; }
}

export async function publishAssessmentResult(schoolId: string, assessmentId: string, publishedByUserId: string) {
  const approval = await db.auditEvent.findFirst({
    where: { schoolId, entityType: "AssessmentDefinition", entityId: assessmentId, action: "assessment.result_approved" },
    orderBy: { createdAt: "desc" },
    select: { id: true, actorUserId: true, createdAt: true },
  });
  if (!approval) throw new ResultPublicationValidationError("Assessment result has not been approved.");

  const assessment = await db.assessmentDefinition.findFirst({
    where: { id: assessmentId, schoolId },
    select: { id: true, name: true },
  });
  if (!assessment) throw new ResultPublicationValidationError("Assessment does not belong to this school.");

  const existing = await db.auditEvent.findFirst({
    where: { schoolId, entityType: "AssessmentDefinition", entityId: assessmentId, action: "assessment.result_published" },
    select: { id: true },
  });
  if (existing) throw new ResultPublicationValidationError("This assessment result has already been published.");

  return db.auditEvent.create({
    data: {
      schoolId,
      actorUserId: publishedByUserId,
      action: "assessment.result_published",
      entityType: "AssessmentDefinition",
      entityId: assessmentId,
      previousState: { status: "APPROVED", approvedAt: approval.createdAt.toISOString() },
      currentState: { status: "PUBLISHED", assessmentName: assessment.name },
    },
  });
}
