import type { SyncExecutor } from "@/domain/platform/sync-executor";
import { ATTENDANCE_BULK_ENTITY, ATTENDANCE_BULK_OPERATION } from "./offline-sync";

type AttendanceSyncResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  records?: Array<{
    id?: string;
    studentId?: string;
    enrollmentId?: string;
    status?: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    note?: string | null;
    attendanceDate?: string;
    recordedAt?: string;
  }>;
};

function isRetryableStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export const attendanceBulkSyncExecutor: SyncExecutor = async (item) => {
  if (item.entityType !== ATTENDANCE_BULK_ENTITY || item.operationType !== "UPSERT") {
    return { status: "FAILED", error: "Unsupported synchronization operation." };
  }

  const payload = item.payload as {
    academicSessionId?: string;
    classArmId?: string;
    attendanceDate?: string;
    items?: Array<{
      studentId?: string;
      enrollmentId?: string;
      status?: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
      note?: string;
    }>;
  };

  if (
    !payload.academicSessionId ||
    !payload.classArmId ||
    !payload.attendanceDate ||
    !Array.isArray(payload.items) ||
    payload.items.length === 0 ||
    payload.items.some((entry) => !entry.studentId || !entry.enrollmentId || !entry.status)
  ) {
    return { status: "FAILED", error: "Invalid attendance payload.", retryable: false };
  }

  try {
    const response = await fetch(`/api/schools/${item.schoolId}/attendance/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": item.operationId,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => null)) as AttendanceSyncResponse | null;

    if (response.ok) {
      const records = data?.records ?? [];
      return {
        status: "ACKNOWLEDGED",
        serverVersion: response.headers.get("X-Server-Version") ?? item.operationId,
        authoritative: {
          data: {
            ...payload,
            records,
          },
          serverVersion: response.headers.get("X-Server-Version") ?? item.operationId,
        },
      };
    }

    if (response.status === 409) {
      return {
        status: "CONFLICT",
        error: data?.message ?? data?.error ?? "Server reported an attendance synchronization conflict.",
      };
    }

    return {
      status: "FAILED",
      error: data?.message ?? data?.error ?? `Server rejected synchronization (${response.status}).`,
      retryable: isRetryableStatus(response.status),
    };
  } catch (error) {
    return {
      status: "FAILED",
      error: error instanceof Error ? error.message : "Network synchronization failed.",
      retryable: true,
    };
  }
};
