import { classifyReconciliation, type AssessmentScoreAuthoritativeRecord } from "./reconciliation";
import { applyAuthoritativeLocalRecord, getLocalRecordByEntity, markLocalRecordState } from "./local-repository";
import { localRecordId } from "./client-operation";

export type AssessmentScorePullResponse = {
  ok: boolean;
  assessment: { id: string };
  students: Array<{
    studentId: string;
    score: number | null;
    scoreId: string | null;
    updatedAt: string | null;
    serverVersion: string | null;
  }>;
  error?: string;
  message?: string;
};

type LocalScore = {
  assessmentId: string;
  studentId: string;
  score: number;
};

export type ReconcileAssessmentScoresResult = {
  pulled: number;
  applied: number;
  ignored: number;
  conflicts: number;
};

export async function reconcileAssessmentScores(input: {
  schoolId: string;
  assessmentId: string;
  fetchImpl?: typeof fetch;
  canApplyServerRecord?: (local: Awaited<ReturnType<typeof getLocalRecordByEntity<LocalScore>>>, server: AssessmentScoreAuthoritativeRecord) => boolean;
}): Promise<ReconcileAssessmentScoresResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(
    `/api/schools/${encodeURIComponent(input.schoolId)}/assessments/scores?assessmentId=${encodeURIComponent(input.assessmentId)}`,
    { credentials: "include", cache: "no-store" },
  );

  let payload: AssessmentScorePullResponse;
  try {
    payload = (await response.json()) as AssessmentScorePullResponse;
  } catch {
    throw new Error("Assessment score reconciliation returned an unreadable response.");
  }

  if (!response.ok || !payload.ok) {
    throw new Error(payload.message ?? payload.error ?? `Assessment score reconciliation failed (${response.status}).`);
  }

  const result: ReconcileAssessmentScoresResult = { pulled: 0, applied: 0, ignored: 0, conflicts: 0 };

  for (const student of payload.students) {
    if (student.scoreId === null || student.score === null || !student.updatedAt || !student.serverVersion) {
      continue;
    }

    result.pulled += 1;
    const entityId = `${input.assessmentId}:${student.studentId}`;
    const recordId = localRecordId(input.schoolId, "AssessmentScore", entityId);
    const local = await getLocalRecordByEntity<LocalScore>(input.schoolId, "AssessmentScore", entityId);
    const server: AssessmentScoreAuthoritativeRecord = {
      schoolId: input.schoolId,
      entityType: "AssessmentScore",
      entityId,
      data: {
        assessmentId: input.assessmentId,
        studentId: student.studentId,
        score: student.score,
        updatedAt: student.updatedAt,
      },
      serverVersion: student.serverVersion,
      updatedAt: student.updatedAt,
    };

    const decision = classifyReconciliation(
      local,
      server,
      {
        canApplyServerRecord: input.canApplyServerRecord ?? ((current) => current?.syncState !== "PENDING_SYNC" && current?.syncState !== "SYNCING"),
      },
    );

    if (decision === "IGNORE") {
      result.ignored += 1;
      continue;
    }

    if (decision === "CONFLICT") {
      result.conflicts += 1;
      if (local) await markLocalRecordState(local.id, "CONFLICT", server.serverVersion);
      continue;
    }

    if (local) {
      await applyAuthoritativeLocalRecord({
        id: local.id,
        data: server.data,
        serverVersion: server.serverVersion,
        updatedAt: server.updatedAt,
      });
    } else {
      await applyAuthoritativeLocalRecord({
        id: recordId,
        data: server.data,
        serverVersion: server.serverVersion,
        updatedAt: server.updatedAt,
      });
    }
    result.applied += 1;
  }

  return result;
}
