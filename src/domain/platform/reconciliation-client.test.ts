import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { localRecordId } from "./client-operation";
import { getLocalRecordByEntity, saveLocalMutation } from "./local-repository";
import { reconcileAssessmentScores } from "./reconciliation-client";
import { openAppSchoolLocalDb } from "./local-store";

type TestScore = {
  assessmentId: string;
  studentId: string;
  score: number;
  updatedAt?: string;
};

const SCHOOL_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ASSESSMENT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const STUDENT_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

async function clearDb() {
  const db = await openAppSchoolLocalDb();
  const transaction = db.transaction(["records", "outbox"], "readwrite");
  transaction.objectStore("records").clear();
  transaction.objectStore("outbox").clear();
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  db.close();
}

afterEach(async () => {
  vi.restoreAllMocks();
  await clearDb();
});

describe("assessment score reconciliation", () => {
  it("applies an authoritative changed server score", async () => {
    await saveLocalMutation({
      schoolId: SCHOOL_ID,
      entityType: "AssessmentScore",
      entityId: `${ASSESSMENT_ID}:${STUDENT_ID}`,
      operationType: "UPSERT",
      payload: { assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 8 },
      operationId: "assessment.score:test-apply",
      record: {
        id: localRecordId(SCHOOL_ID, "AssessmentScore", `${ASSESSMENT_ID}:${STUDENT_ID}`),
        schoolId: SCHOOL_ID,
        entityType: "AssessmentScore",
        entityId: `${ASSESSMENT_ID}:${STUDENT_ID}`,
        data: { assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 8 },
        syncState: "SYNCED",
        serverVersion: "2026-09-16T10:00:00.000Z",
      },
    });

    const result = await reconcileAssessmentScores({
      schoolId: SCHOOL_ID,
      assessmentId: ASSESSMENT_ID,
      fetchImpl: vi.fn(async () => new Response(JSON.stringify({
        ok: true,
        assessment: { id: ASSESSMENT_ID },
        students: [{
          studentId: STUDENT_ID,
          score: 7.5,
          scoreId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
          updatedAt: "2026-09-16T10:01:00.000Z",
          serverVersion: "2026-09-16T10:01:00.000Z",
        }],
      }), { status: 200 })),
    });

    const local = await getLocalRecordByEntity<TestScore>(SCHOOL_ID, "AssessmentScore", `${ASSESSMENT_ID}:${STUDENT_ID}`);
    expect(result).toEqual({ pulled: 1, applied: 1, ignored: 0, conflicts: 0 });
    expect(local?.syncState).toBe("SYNCED");
    expect(local?.data).toEqual({ assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 7.5, updatedAt: "2026-09-16T10:01:00.000Z" });
    expect(local?.serverVersion).toBe("2026-09-16T10:01:00.000Z");
  });

  it("does not overwrite a pending local edit", async () => {
    await saveLocalMutation({
      schoolId: SCHOOL_ID,
      entityType: "AssessmentScore",
      entityId: `${ASSESSMENT_ID}:${STUDENT_ID}`,
      operationType: "UPSERT",
      payload: { assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 9 },
      operationId: "assessment.score:test-pending",
      record: {
        id: localRecordId(SCHOOL_ID, "AssessmentScore", `${ASSESSMENT_ID}:${STUDENT_ID}`),
        schoolId: SCHOOL_ID,
        entityType: "AssessmentScore",
        entityId: `${ASSESSMENT_ID}:${STUDENT_ID}`,
        data: { assessmentId: ASSESSMENT_ID, studentId: STUDENT_ID, score: 9 },
        syncState: "PENDING_SYNC",
        serverVersion: "2026-09-16T10:00:00.000Z",
      },
    });

    const result = await reconcileAssessmentScores({
      schoolId: SCHOOL_ID,
      assessmentId: ASSESSMENT_ID,
      fetchImpl: vi.fn(async () => new Response(JSON.stringify({
        ok: true,
        assessment: { id: ASSESSMENT_ID },
        students: [{
          studentId: STUDENT_ID,
          score: 7,
          scoreId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
          updatedAt: "2026-09-16T10:01:00.000Z",
          serverVersion: "2026-09-16T10:01:00.000Z",
        }],
      }), { status: 200 })),
    });

    const local = await getLocalRecordByEntity<TestScore>(SCHOOL_ID, "AssessmentScore", `${ASSESSMENT_ID}:${STUDENT_ID}`);
    expect(result.conflicts).toBe(1);
    expect(local?.syncState).toBe("CONFLICT");
    expect(local?.data.score).toBe(9);
  });
});
