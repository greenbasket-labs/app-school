import { db } from "@/lib/db";

export type AssessmentScoreValidation = {
  assessmentId: string;
  rosterCount: number;
  scoredCount: number;
  missingCount: number;
  invalidCount: number;
  valid: boolean;
  missingStudentIds: string[];
  invalidStudentIds: string[];
};

export class AssessmentScoreValidationContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssessmentScoreValidationContextError";
  }
}

export async function validateAssessmentScores(
  schoolId: string,
  assessmentId: string,
): Promise<AssessmentScoreValidation> {
  const assessment = await db.assessmentDefinition.findFirst({
    where: { id: assessmentId, schoolId },
    select: { id: true, academicSessionId: true, classArmId: true, maxScore: true },
  });

  if (!assessment) {
    throw new AssessmentScoreValidationContextError("Assessment does not belong to this school.");
  }

  const roster = await db.enrollment.findMany({
    where: {
      academicSessionId: assessment.academicSessionId,
      classArmId: assessment.classArmId,
      status: "ACTIVE",
      student: { schoolId },
    },
    select: { studentId: true },
  });

  const studentIds = roster.map((entry) => entry.studentId);
  const scores = studentIds.length
    ? await db.assessmentScore.findMany({
        where: { schoolId, assessmentId: assessment.id, studentId: { in: studentIds } },
        select: { studentId: true, score: true },
      })
    : [];

  const scoreByStudent = new Map(scores.map((entry) => [entry.studentId, entry.score.toNumber()]));
  const maxScore = assessment.maxScore.toNumber();
  const missingStudentIds = studentIds.filter((studentId) => !scoreByStudent.has(studentId));
  const invalidStudentIds = studentIds.filter((studentId) => {
    const score = scoreByStudent.get(studentId);
    return score !== undefined && (!Number.isFinite(score) || score < 0 || score > maxScore);
  });

  return {
    assessmentId: assessment.id,
    rosterCount: studentIds.length,
    scoredCount: studentIds.length - missingStudentIds.length,
    missingCount: missingStudentIds.length,
    invalidCount: invalidStudentIds.length,
    valid: missingStudentIds.length === 0 && invalidStudentIds.length === 0,
    missingStudentIds,
    invalidStudentIds,
  };
}
