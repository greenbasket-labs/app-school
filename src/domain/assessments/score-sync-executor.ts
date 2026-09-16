import type { SyncExecutor } from "@/domain/platform/sync-executor";

type ScoreSyncResponse = {
  ok?: boolean;
  message?: string;
  serverVersion?: string | null;
  score?: {
    id?: string;
    assessmentId?: string;
    studentId?: string;
    score?: number;
    updatedAt?: string;
    serverVersion?: string | null;
  };
};

export const assessmentScoreSyncExecutor: SyncExecutor = async (item) => {
  if (item.entityType !== "AssessmentScore" || item.operationType !== "UPSERT") {
    return { status: "FAILED", error: "Unsupported synchronization operation." };
  }

  const payload = item.payload as { assessmentId?: string; studentId?: string; score?: number };
  if (!payload.assessmentId || !payload.studentId || typeof payload.score !== "number") {
    return { status: "FAILED", error: "Invalid assessment score payload." };
  }

  try {
    const response = await fetch(`/api/schools/${item.schoolId}/assessments/scores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": item.operationId,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null) as ScoreSyncResponse | null;

    if (response.ok) {
      const authoritative = data?.score;
      const serverVersion = authoritative?.serverVersion ?? data?.serverVersion ?? response.headers.get("ETag")?.replace(/^"|"$/g, "") ?? response.headers.get("X-Server-Version");
      if (!authoritative || typeof authoritative.score !== "number" || !authoritative.assessmentId || !authoritative.studentId || !serverVersion || !authoritative.updatedAt) {
        return {
          status: "FAILED",
          error: "Server acknowledgement did not include complete authoritative score data and version.",
          retryable: false,
        };
      }
      return {
        status: "ACKNOWLEDGED",
        serverVersion,
        authoritative: {
          data: {
            assessmentId: authoritative.assessmentId,
            studentId: authoritative.studentId,
            score: authoritative.score,
          },
          serverVersion,
          updatedAt: authoritative.updatedAt,
        },
      };
    }

    if (response.status === 409) {
      return { status: "CONFLICT", error: data?.message ?? "Server reported a synchronization conflict." };
    }

    const retryable = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
    return {
      status: "FAILED",
      error: data?.message ?? `Server rejected synchronization (${response.status}).`,
      retryable,
    };
  } catch (error) {
    return {
      status: "FAILED",
      error: error instanceof Error ? error.message : "Network synchronization failed.",
      retryable: true,
    };
  }
};
