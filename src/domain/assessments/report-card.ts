import { db } from "@/lib/db";

export class ReportCardValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportCardValidationError";
  }
}

export async function getPublishedReportCard(
  schoolId: string,
  studentId: string,
  academicSessionId: string,
  academicTermId: string,
) {
  const student = await db.student.findFirst({
    where: { id: studentId, schoolId },
    select: {
      id: true,
      admissionNumber: true,
      firstName: true,
      middleName: true,
      lastName: true,
    },
  });
  if (!student) throw new ReportCardValidationError("Student does not belong to this school.");

  const term = await db.academicTerm.findFirst({
    where: { id: academicTermId, academicSessionId, academicSession: { schoolId } },
    select: { id: true, name: true, order: true, academicSessionId: true },
  });
  if (!term) throw new ReportCardValidationError("Academic term does not belong to this school or session.");

  const enrollment = await db.enrollment.findFirst({
    where: { studentId, academicSessionId, status: { in: ["ACTIVE", "COMPLETED"] }, student: { schoolId } },
    select: { id: true, classArmId: true },
  });
  if (!enrollment) throw new ReportCardValidationError("Student has no enrollment in the selected academic session.");

  const published = await db.auditEvent.findMany({
    where: {
      schoolId,
      entityType: "AssessmentDefinition",
      action: "assessment.result_published",
      entityId: { not: null },
    },
    orderBy: { createdAt: "asc" },
    select: { entityId: true, createdAt: true },
  });

  const assessmentIds = published.flatMap((event) => event.entityId ? [event.entityId] : []);
  if (!assessmentIds.length) {
    return {
      student,
      session: { id: academicSessionId },
      term,
      classArmId: enrollment.classArmId,
      assessments: [],
      totals: { earned: 0, possible: 0, percentage: null },
    };
  }

  const assessments = await db.assessmentDefinition.findMany({
    where: {
      id: { in: assessmentIds },
      schoolId,
      academicSessionId,
      academicTermId,
      classArmId: enrollment.classArmId,
    },
    select: {
      id: true,
      name: true,
      maxScore: true,
      subject: { select: { id: true, name: true, code: true } },
      scores: { where: { studentId }, select: { score: true } },
    },
    orderBy: [{ subject: { name: "asc" } }, { name: "asc" }],
  });

  const publishedSet = new Set(assessmentIds);
  const rows = assessments.filter((assessment) => publishedSet.has(assessment.id)).map((assessment) => {
    const score = assessment.scores[0]?.score.toNumber() ?? null;
    const maxScore = assessment.maxScore.toNumber();
    return {
      assessmentId: assessment.id,
      subject: assessment.subject,
      assessmentName: assessment.name,
      score,
      maxScore,
      percentage: score === null || maxScore === 0 ? null : Number(((score / maxScore) * 100).toFixed(2)),
    };
  });

  const earned = rows.reduce((sum, row) => sum + (row.score ?? 0), 0);
  const possible = rows.reduce((sum, row) => sum + row.maxScore, 0);

  return {
    student,
    session: { id: academicSessionId },
    term,
    classArmId: enrollment.classArmId,
    assessments: rows,
    totals: {
      earned,
      possible,
      percentage: possible === 0 ? null : Number(((earned / possible) * 100).toFixed(2)),
    },
  };
}
