import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_SCHOOL_LOCAL_DB, openAppSchoolLocalDb } from "./local-store";
import { saveLocalMutation, getLocalRecordByEntity } from "./local-repository";
import { getPendingOutbox } from "./local-outbox";
import { runPendingSync } from "./sync-engine";

describe("sync engine", () => {
  beforeEach(async () => {
    const db = await openAppSchoolLocalDb();
    db.close();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(APP_SCHOOL_LOCAL_DB);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Could not reset IndexedDB."));
    });
  });

  it("acknowledges once and replaces local data with authoritative server state", async () => {
    const schoolId = "school-sync";
    const operationId = "op-sync-1";

    await saveLocalMutation({
      schoolId,
      entityType: "AssessmentScore",
      entityId: "score-1",
      operationType: "UPSERT",
      operationId,
      payload: { assessmentId: "assessment-1", studentId: "student-1", score: 8 },
      record: {
        id: `${schoolId}:AssessmentScore:score-1`,
        schoolId,
        entityType: "AssessmentScore",
        entityId: "score-1",
        data: { assessmentId: "assessment-1", studentId: "student-1", score: 8 },
        syncState: "PENDING_SYNC",
      },
    });

    const executor = vi.fn().mockResolvedValue({
      status: "ACKNOWLEDGED" as const,
      serverVersion: "server-v2",
      authoritative: {
        data: { assessmentId: "assessment-1", studentId: "student-1", score: 8.5 },
        serverVersion: "server-v2",
        updatedAt: "2026-09-16T08:00:02.000Z",
      },
    });

    const first = await runPendingSync(schoolId, executor, new Date("2026-09-16T08:00:00.000Z"));
    const second = await runPendingSync(schoolId, executor, new Date("2026-09-16T08:00:01.000Z"));

    const record = await getLocalRecordByEntity(`${schoolId}`, "AssessmentScore", "score-1");
    const pending = await getPendingOutbox(schoolId, new Date("2026-09-16T08:00:01.000Z"));

    expect(first.acknowledged).toBe(1);
    expect(second.attempted).toBe(0);
    expect(executor).toHaveBeenCalledTimes(1);
    expect(record?.syncState).toBe("SYNCED");
    expect(record?.data).toEqual({ assessmentId: "assessment-1", studentId: "student-1", score: 8.5 });
    expect(record?.serverVersion).toBe("server-v2");
    expect(record?.updatedAt).toBe("2026-09-16T08:00:02.000Z");
    expect(pending).toHaveLength(0);
  });
});
