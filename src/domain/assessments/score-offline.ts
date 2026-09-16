import { localRecordId } from "@/domain/platform/client-operation";
import { saveLocalMutation } from "@/domain/platform/local-repository";

export type LocalScore = {
  assessmentId: string;
  studentId: string;
  score: number;
};

export function scoreOperationId(schoolId: string, assessmentId: string, studentId: string, clientToken: string) {
  return `assessment.score:${schoolId}:${assessmentId}:${studentId}:${clientToken}`;
}

export async function saveScoreLocally(input: {
  schoolId: string;
  assessmentId: string;
  studentId: string;
  score: number;
  operationId: string;
  actorUserId?: string | null;
}) {
  const entityId = `${input.assessmentId}:${input.studentId}`;
  const recordId = localRecordId(input.schoolId, "AssessmentScore", entityId);

  return saveLocalMutation<LocalScore>({
    schoolId: input.schoolId,
    actorUserId: input.actorUserId,
    entityType: "AssessmentScore",
    entityId,
    operationType: "UPSERT",
    payload: {
      assessmentId: input.assessmentId,
      studentId: input.studentId,
      score: input.score,
    },
    operationId: input.operationId,
    record: {
      id: recordId,
      schoolId: input.schoolId,
      entityType: "AssessmentScore",
      entityId,
      data: {
        assessmentId: input.assessmentId,
        studentId: input.studentId,
        score: input.score,
      },
      syncState: "PENDING_SYNC",
    },
  });
}
