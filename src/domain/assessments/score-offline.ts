import { localRecordId } from "@/domain/platform/client-operation";
import { saveLocalMutation } from "@/domain/platform/local-repository";

export type LocalScore = {
  assessmentId: string;
  studentId: string;
  score: number;
};

export async function saveScoreLocally(input: {
  schoolId: string;
  assessmentId: string;
  studentId: string;
  score: number;
  actorUserId?: string | null;
}) {
  const entityId = `${input.assessmentId}:${input.studentId}`;
  const recordId = localRecordId(input.schoolId, "AssessmentScore", entityId);
  const operationId = `assessment.score:${input.schoolId}:${input.assessmentId}:${input.studentId}:${crypto.randomUUID()}`;

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
    operationId,
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
