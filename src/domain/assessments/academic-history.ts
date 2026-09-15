import { db } from "@/lib/db";

export class AcademicHistoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AcademicHistoryValidationError";
  }
}

export async function getAcademicHistory(schoolId: string, studentId: string) {
  const student = await db.student.findFirst({
    where: { id: studentId, schoolId },
    select: { id: true, admissionNumber: true, firstName: true, middleName: true, lastName: true },
  });
  if (!student) throw new AcademicHistoryValidationError("Student does not belong to this school.");

  const publishedEvents = await db.auditEvent.findMany({
    where: {
      schoolId,
      entityType: "AssessmentDefinition",
      action: "assessment.result_published",
      entityId: { not: null },
    },
    orderBy: { occurredAt: "asc" },
    select: { entityId: true, occurredAt: true },
  });

  const assessmentIds = publishedEvents.flatMap((event) => event.entityId ? [event.entityId] : []);
  if (!assessmentIds.length) return { student, history: [] };

  const assessments = await db.assessmentDefinition.findMany({
    where: { id: { in: assessmentIds }, schoolId, scores: { some: { studentId } } },
    select: {
      id: true,
      academicSessionId: true,
      academicTermId: true,
      name: true,
      maxScore: true,
      academicSession: { select: { id: true, name: true, startsAt: true, endsAt: true } },
      academicTerm: { select: { id: true, name: true, order: true } },
      subject: { select: { id: true, name: true, code: true } },
      scores: { where: { studentId }, select: { score: true } },
    },
    orderBy: [{ academicSession: { startsAt: "asc" } }, { academicTerm: { order: "asc" } }, { subject: { name: "asc" } }, { name: "asc" }],
  });

  const publishedSet = new Set(assessmentIds);
  const history = assessments.filter((assessment) => publishedSet.has(assessment.id)).map((assessment) => {
    const score = assessment.scores[0]?.score.toNumber() ?? null;
    const maxScore = assessment.maxScore.toNumber();
    return {
      assessmentId: assessment.id,
      session: assessment.academicSession,
      term: assessment.academicTerm,
      subject: assessment.subject,
      assessmentName: assessment.name,
      score,
      maxScore,
      percentage: score === null || maxScore === 0 ? null : Number(((score / maxScore) * 100).toFixed(2)),
    };
  });

  return { student, history };
}
