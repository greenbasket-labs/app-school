import { describe, expect, it, vi, beforeEach } from "vitest";

const validateAssessmentScores = vi.fn();
const assessmentFindFirst = vi.fn();
const auditFindFirst = vi.fn();
const auditCreate = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    assessmentDefinition: { findFirst: assessmentFindFirst },
    auditEvent: { findFirst: auditFindFirst, create: auditCreate },
  },
}));

vi.mock("@/domain/assessments/score-validation", () => ({
  validateAssessmentScores,
}));

import { ResultSubmissionValidationError, submitAssessmentResult } from "./result-submission";

describe("submitAssessmentResult", () => {
  beforeEach(() => {
    validateAssessmentScores.mockReset();
    assessmentFindFirst.mockReset();
    auditFindFirst.mockReset();
    auditCreate.mockReset();
  });

  it("blocks incomplete or invalid results before submission", async () => {
    validateAssessmentScores.mockResolvedValue({ valid: false, missingCount: 2, invalidCount: 1, rosterCount: 5 });

    await expect(submitAssessmentResult("school-1", "assessment-1", "user-1"))
      .rejects.toBeInstanceOf(ResultSubmissionValidationError);
    expect(assessmentFindFirst).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it("rejects a result that was already submitted", async () => {
    validateAssessmentScores.mockResolvedValue({ valid: true, missingCount: 0, invalidCount: 0, rosterCount: 2 });
    assessmentFindFirst.mockResolvedValue({ id: "assessment-1", name: "First CA" });
    auditFindFirst.mockResolvedValue({ id: "event-1" });

    await expect(submitAssessmentResult("school-1", "assessment-1", "user-1"))
      .rejects.toMatchObject({ message: "This assessment result has already been submitted." });
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it("records a submission after valid scores are confirmed", async () => {
    validateAssessmentScores.mockResolvedValue({ valid: true, missingCount: 0, invalidCount: 0, rosterCount: 2 });
    assessmentFindFirst.mockResolvedValue({ id: "assessment-1", name: "First CA" });
    auditFindFirst.mockResolvedValue(null);
    auditCreate.mockResolvedValue({ id: "event-1", occurredAt: new Date("2026-09-17T20:00:00.000Z") });

    const result = await submitAssessmentResult("school-1", "assessment-1", "user-1");

    expect(result.id).toBe("event-1");
    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        schoolId: "school-1",
        actorUserId: "user-1",
        action: "assessment.result_submitted",
        entityType: "AssessmentDefinition",
        entityId: "assessment-1",
        previousState: { status: "DRAFT" },
        currentState: { status: "SUBMITTED", assessmentName: "First CA" },
      },
    });
  });
});
