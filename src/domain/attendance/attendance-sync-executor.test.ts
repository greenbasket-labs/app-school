import { afterEach, describe, expect, it, vi } from "vitest";
import { attendanceBulkSyncExecutor } from "./attendance-sync-executor";

const schoolId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const operationId = "attendance-op-1";

const baseItem = {
  operationId,
  schoolId,
  actorUserId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  entityType: "AttendanceBulk",
  entityId: "entity-1",
  operationType: "UPSERT",
  payload: {
    academicSessionId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    classArmId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    attendanceDate: "2026-09-17T00:00:00.000Z",
    items: [
      {
        studentId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
        enrollmentId: "ffffffff-ffff-ffff-ffff-ffffffffffff",
        status: "PRESENT" as const,
      },
    ],
  },
  createdAt: "2026-09-17T10:00:00.000Z",
  attemptCount: 0,
  status: "PENDING" as const,
  lastError: null,
  nextAttemptAt: null,
};

afterEach(() => vi.unstubAllGlobals());

describe("attendance bulk sync executor", () => {
  it("sends the queued batch with the operation idempotency key and acknowledges the response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            ok: true,
            records: [
              {
                id: "11111111-1111-1111-1111-111111111111",
                studentId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
                enrollmentId: "ffffffff-ffff-ffff-ffff-ffffffffffff",
                status: "PRESENT",
                note: null,
                attendanceDate: "2026-09-17T00:00:00.000Z",
                recordedAt: "2026-09-17T10:01:00.000Z",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json", "X-Server-Version": "attendance-v2" } },
        ),
      ),
    );

    const result = await attendanceBulkSyncExecutor(baseItem);

    expect(result.status).toBe("ACKNOWLEDGED");
    expect(result.serverVersion).toBe("attendance-v2");
    expect(result.authoritative?.serverVersion).toBe("attendance-v2");
    expect(fetch).toHaveBeenCalledWith(
      `/api/schools/${schoolId}/attendance/bulk`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Idempotency-Key": operationId }),
      }),
    );
  });

  it("marks network failures as retryable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );

    const result = await attendanceBulkSyncExecutor(baseItem);

    expect(result).toEqual({
      status: "FAILED",
      error: "offline",
      retryable: true,
    });
  });

  it("treats a server conflict as a conflict instead of a retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: false, message: "Attendance changed elsewhere." }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const result = await attendanceBulkSyncExecutor(baseItem);

    expect(result).toEqual({
      status: "CONFLICT",
      error: "Attendance changed elsewhere.",
    });
  });
});
