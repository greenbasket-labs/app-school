import type { SyncExecutor } from "@/domain/platform/sync-executor";

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

    const data = await response.json().catch(() => null) as { ok?: boolean; message?: string } | null;

    if (response.ok) {
      return {
        status: "ACKNOWLEDGED",
        serverVersion: response.headers.get("ETag") ?? response.headers.get("X-Server-Version"),
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
