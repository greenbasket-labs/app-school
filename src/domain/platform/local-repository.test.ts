import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { APP_SCHOOL_LOCAL_DB, openAppSchoolLocalDb, LOCAL_STORES } from "./local-store";
import { listLocalRecords, saveLocalMutation } from "./local-repository";
import { getPendingOutbox } from "./local-outbox";

const schoolId = "school-test";
const recordId = `${schoolId}:AssessmentScore:score-1`;

async function resetDb() {
  const db = await openAppSchoolLocalDb();
  db.close();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(APP_SCHOOL_LOCAL_DB);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Could not reset IndexedDB."));
    request.onblocked = () => reject(new Error("IndexedDB reset was blocked."));
  });
}

describe("local repository", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("persists a local record and exactly one durable outbox item for an operation", async () => {
    const mutation = {
      schoolId,
      entityType: "AssessmentScore",
      entityId: "score-1",
      operationType: "UPSERT",
      operationId: "assessment.score:school-test:assessment-1:student-1:1",
      payload: { assessmentId: "assessment-1", studentId: "student-1", score: 8 },
      record: {
        id: recordId,
        schoolId,
        entityType: "AssessmentScore",
        entityId: "score-1",
        data: { assessmentId: "assessment-1", studentId: "student-1", score: 8 },
        syncState: "PENDING_SYNC" as const,
      },
    };

    await saveLocalMutation(mutation);
    await saveLocalMutation(mutation);

    const records = await listLocalRecords(schoolId, "AssessmentScore");
    const outbox = await getPendingOutbox(schoolId, new Date("2026-09-16T08:00:00.000Z"));

    expect(records).toHaveLength(1);
    expect(records[0]?.data).toEqual(mutation.record.data);
    expect(records[0]?.syncState).toBe("PENDING_SYNC");
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.operationId).toBe(mutation.operationId);
  });
});
