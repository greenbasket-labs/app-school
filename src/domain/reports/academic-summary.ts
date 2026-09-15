import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export class AcademicSummaryValidationError extends Error {
  constructor(message: string) { super(message); this.name = "AcademicSummaryValidationError"; }
}

export async function getAcademicSummary(schoolId: string, academicSessionId: string, academicTermId: string, classArmId?: string) {
  const session = await db.academicSession.findFirst({ where: { id: academicSessionId, schoolId }, select: { id: true, name: true } });
  if (!session) throw new AcademicSummaryValidationError("Academic session does not belong to this school.");
  const term = await db.academicTerm.findFirst({ where: { id: academicTermId, academicSessionId }, select: { id: true, name: true, order: true } });
  if (!term) throw new AcademicSummaryValidationError("Academic term does not belong to the selected session.");
  if (classArmId) {
    const arm = await db.classArm.findFirst({ where: { id: classArmId, classLevel: { schoolId } }, select: { id: true } });
    if (!arm) throw new AcademicSummaryValidationError("Class arm does not belong to this school.");
  }
  const rows = await db.$queryRaw<Array<{ studentId: string; admissionNumber: string; studentName: string; assessments: bigint; scored: bigint; earned: string; possible: string }>>(Prisma.sql`
    WITH published AS (
      SELECT DISTINCT "entityId" AS "assessmentId" FROM "AuditEvent"
      WHERE "schoolId" = ${schoolId}::uuid AND "entityType" = 'AssessmentDefinition'
        AND "action" = 'assessment.result_published' AND "entityId" IS NOT NULL
    )
    SELECT s."id" AS "studentId", s."admissionNumber",
      TRIM(CONCAT_WS(' ', s."firstName", s."middleName", s."lastName")) AS "studentName",
      COUNT(DISTINCT a."id") AS "assessments", COUNT(sc."id") AS "scored",
      COALESCE(SUM(sc."score"), 0)::text AS "earned", COALESCE(SUM(a."maxScore"), 0)::text AS "possible"
    FROM "Enrollment" e
    JOIN "Student" s ON s."id" = e."studentId" AND s."schoolId" = ${schoolId}::uuid
    JOIN "AssessmentDefinition" a ON a."schoolId" = ${schoolId}::uuid
      AND a."academicSessionId" = ${academicSessionId}::uuid AND a."academicTermId" = ${academicTermId}::uuid
      AND a."classArmId" = e."classArmId"
    JOIN published p ON p."assessmentId" = a."id"
    LEFT JOIN "AssessmentScore" sc ON sc."assessmentId" = a."id" AND sc."studentId" = s."id" AND sc."schoolId" = ${schoolId}::uuid
    WHERE e."academicSessionId" = ${academicSessionId}::uuid AND e."status" IN ('ACTIVE', 'COMPLETED')
      AND (${classArmId ?? null}::uuid IS NULL OR e."classArmId" = ${classArmId ?? null}::uuid)
    GROUP BY s."id", s."admissionNumber", s."firstName", s."middleName", s."lastName"
    ORDER BY s."lastName", s."firstName", s."admissionNumber"
  `);
  const students = rows.map((row) => {
    const earned = Number(row.earned), possible = Number(row.possible), assessments = Number(row.assessments), scored = Number(row.scored);
    return { studentId: row.studentId, admissionNumber: row.admissionNumber, studentName: row.studentName, assessments, scored, missingScores: Math.max(0, assessments - scored), earned, possible, percentage: possible === 0 ? null : Number(((earned / possible) * 100).toFixed(2)) };
  });
  const earned = students.reduce((sum, s) => sum + s.earned, 0), possible = students.reduce((sum, s) => sum + s.possible, 0);
  return { session, term, classArmId: classArmId ?? null, students, totals: { students: students.length, assessmentsPublished: students.reduce((max, s) => Math.max(max, s.assessments), 0), earned, possible, percentage: possible === 0 ? null : Number(((earned / possible) * 100).toFixed(2)) } };
}
