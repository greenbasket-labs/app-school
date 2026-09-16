import type { SyncExecutor } from "@/domain/platform/sync-executor";
import type { LocalAttendanceDay } from "./offline";

type AttendanceSyncResponse = {
  ok: boolean;
  records?: Array<{
    id: string;
    studentId: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
    note: string | null;
    recordedAt: string;
  }>;
  error?: string;
  message?: string;
};

export const attendanceSyncExecutor: SyncExecutor = async (item) => {
  const payload = item.payload as LocalAttendanceDay;

  try {
    const response = await fetch(`/api/schools/${encodeURIComponent(item.schoolId)}/attendance/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": item.operationId,
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    let data: AttendanceSyncResponse;
    try {
      data = (await response.json()) as AttendanceSyncResponse;
    } catch {
      return { status: "FAILED", error: "Attendance synchronization returned an unreadable response.", retryable: response.status >= 500 };
    }

    if (response.ok && data.ok && data.records) {
      const updatedAt = data.records.reduce<string | null>((latest, record) => {
        if (!latest || record.recordedAt > latest) return record.recordedAt;
        return latest;
      }, null);
      return {
        status: "ACKNOWLEDGED",
        authoritative: {
          data: {
            ...payload,
            items: payload.items.map((item) => ({ ...item })),
          },
          serverVersion: updatedAt ?? new Date().toISOString(),
          updatedAt: updatedAt ?? undefined,
        },
      };
    }

    if (response.status === 409) return { status: "CONFLICT", error: data.message ?? data.error ?? "Attendance synchronization conflict." };
    if (response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500) {
      return { status: "FAILED", error: data.message ?? data.error ?? `Attendance synchronization failed (${response.status}).`, retryable: true };
    }

    return { status: "FAILED", error: data.message ?? data.error ?? `Attendance synchronization failed (${response.status}).`, retryable: false };
  } catch (error) {
    return { status: "FAILED", error: error instanceof Error ? error.message : "Attendance synchronization failed.", retryable: true };
  }
};
