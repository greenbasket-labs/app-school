import { db } from "@/lib/db";

export class ResultApprovalValidationError extends Error {
  constructor(message: string) { super(message); this.name = "ResultApprovalValidationError"; }
}

export async function approveAssessmentResult(schoolId: string, assessmentId: string, approvedByUserId: string) {
  const submission = await db.auditEvent.findFirst({
    where: { schoolId, entityType: "AssessmentDefinition", entityId: assessmentId, action: "assessment.result_submitted" },
    orderBy: { occurredAt: "desc" },
    select: { id: true, actorUserId: true, occurredAt: true },
  });
  if (!submission) throw new ResultApprovalValidationError("Assessment result has not been submitted.");
  if (submission.actorUserId === approvedByUserId) throw new ResultApprovalValidationError("The person who submitted a result cannot approve the same result.");

  const existingApproval = await db.auditEvent.findFirst({
    where: { schoolId, entityType: "AssessmentDefinition", entityId: assessmentId, action: "assessment.result_approved" },
    select: { id: true },
  });
  if (existingApproval) throw new ResultApprovalValidationError("This assessment result has already been approved.");

  const assessment = await db.assessmentDefinition.findFirst({ where: { id: assessmentId, schoolId }, select: { id: true, name: true } });
  if (!assessment) throw new ResultApprovalValidationError("Assessment does not belong to this school.");

  return db.auditEvent.create({
    data: {
      schoolId, actorUserId: approvedByUserId, action: "assessment.result_approved",
      entityType: "AssessmentDefinition", entityId: assessmentId,
      previousState: { status: "SUBMITTED", submittedAt: submission.occurredAt.toISOString() },
      currentState: { status: "APPROVED", assessmentName: assessment.name },
    },
  });
}
