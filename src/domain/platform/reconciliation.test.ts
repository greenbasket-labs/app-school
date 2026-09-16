import { describe, expect, it } from "vitest";
import { classifyReconciliation, assessmentScoreServerVersion } from "./reconciliation";
import type { LocalRecord } from "./local-store";

type Score = { assessmentId: string; studentId: string; score: number };

function local(overrides: Partial<LocalRecord<Score>> = {}): LocalRecord<Score> {
  return {
    id: "school-a:AssessmentScore:assessment:student",
    schoolId: "school-a",
    entityType: "AssessmentScore",
    entityId: "assessment:student",
    data: { assessmentId: "assessment", studentId: "student", score: 8 },
    syncState: "SYNCED",
    serverVersion: "2026-09-16T08:00:00.000Z",
    updatedAt: "2026-09-16T08:00:00.000Z",
    ...overrides,
  };
}

describe("reconciliation", () => {
  it("ignores a record already at the authoritative server version", () => {
    const server = {
      schoolId: "school-a",
      entityType: "AssessmentScore",
      entityId: "assessment:student",
      data: { assessmentId: "assessment", studentId: "student", score: 8 },
      serverVersion: "2026-09-16T08:00:00.000Z",
      updatedAt: "2026-09-16T08:00:00.000Z",
    };

    expect(classifyReconciliation(local(), server, { canApplyServerRecord: () => true })).toBe("IGNORE");
  });

  it("applies a newer authoritative server record when policy allows", () => {
    const server = {
      schoolId: "school-a",
      entityType: "AssessmentScore",
      entityId: "assessment:student",
      data: { assessmentId: "assessment", studentId: "student", score: 7.5 },
      serverVersion: "2026-09-16T08:01:00.000Z",
      updatedAt: "2026-09-16T08:01:00.000Z",
    };

    expect(classifyReconciliation(local(), server, { canApplyServerRecord: () => true })).toBe("APPLY");
  });

  it("marks a newer server record as conflict when policy rejects replacement", () => {
    const server = {
      schoolId: "school-a",
      entityType: "AssessmentScore",
      entityId: "assessment:student",
      data: { assessmentId: "assessment", studentId: "student", score: 7.5 },
      serverVersion: "2026-09-16T08:01:00.000Z",
      updatedAt: "2026-09-16T08:01:00.000Z",
    };

    expect(classifyReconciliation(local({ syncState: "PENDING_SYNC" }), server, { canApplyServerRecord: () => false })).toBe("CONFLICT");
  });

  it("builds a deterministic assessment score server version", () => {
    expect(assessmentScoreServerVersion(new Date("2026-09-16T08:01:00.000Z"), "score-1")).toBe("2026-09-16T08:01:00.000Z:score-1");
  });
});
