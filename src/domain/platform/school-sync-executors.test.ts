import { afterEach, describe, expect, it, vi } from "vitest";
import { schoolSyncExecutor } from "./school-sync-executors";

const baseItem = {
  operationId: "op-1",
  schoolId: "school-1",
  actorUserId: "user-1",
  entityId: "entity-1",
  operationType: "UPSERT",
  payload: {},
};

afterEach(() => vi.restoreAllMocks());

describe("school sync executor", () => {
  it("rejects an unregistered offline entity without retrying", async () => {
    const result = await schoolSyncExecutor({
      ...baseItem,
      entityType: "UnknownEntity",
    });

    expect(result).toEqual({
      status: "FAILED",
      error: "No synchronization executor registered for UnknownEntity/UPSERT.",
      retryable: false,
    });
  });

  it("routes registered attendance work to the attendance executor", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, records: [] }), {
        status: 200,
        headers: { "X-Server-Version": "attendance-test" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await schoolSyncExecutor({
      ...baseItem,
      entityType: "AttendanceBulk",
      payload: {
        academicSessionId: "session-1",
        classArmId: "arm-1",
        attendanceDate: "2026-09-17T00:00:00.000Z",
        items: [
          { studentId: "student-1", enrollmentId: "enrollment-1", status: "PRESENT" },
        ],
      },
    });

    expect(result.status).toBe("ACKNOWLEDGED");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
