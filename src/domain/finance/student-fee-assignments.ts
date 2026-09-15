import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export class StudentFeeAssignmentValidationError extends Error {
  constructor(message: string) { super(message); this.name = "StudentFeeAssignmentValidationError"; }
}

export class StudentFeeAssignmentConflictError extends Error {
  constructor(message: string) { super(message); this.name = "StudentFeeAssignmentConflictError"; }
}

export async function listStudentFeeAssignments(schoolId: string) {
  return db.$queryRaw<Array<{
    id: string; studentId: string; feeStructureId: string; amount: string;
    admissionNumber: string; firstName: string; lastName: string;
    feeName: string; sessionName: string; termName: string;
  }>>(Prisma.sql`
    SELECT a."id", a."studentId", a."feeStructureId", a."amount"::text AS "amount",
           st."admissionNumber", st."firstName", st."lastName",
           f."name" AS "feeName", s."name" AS "sessionName", t."name" AS "termName"
    FROM "StudentFeeAssignment" a
    INNER JOIN "Student" st ON st."id" = a."studentId" AND st."schoolId" = a."schoolId"
    INNER JOIN "FeeStructure" f ON f."id" = a."feeStructureId" AND f."schoolId" = a."schoolId"
    INNER JOIN "AcademicSession" s ON s."id" = f."academicSessionId" AND s."schoolId" = a."schoolId"
    INNER JOIN "AcademicTerm" t ON t."id" = f."academicTermId" AND t."academicSessionId" = f."academicSessionId"
    WHERE a."schoolId" = ${schoolId}::uuid
    ORDER BY st."lastName", st."firstName", s."startsAt" DESC, t."order", f."name"
  `);
}

export async function getStudentFeeAssignmentOptions(schoolId: string) {
  const [fees, students] = await Promise.all([
    db.$queryRaw<Array<{ id: string; name: string; amount: string; sessionId: string; sessionName: string; termId: string; termName: string }>>(Prisma.sql`
      SELECT f."id", f."name", f."amount"::text AS "amount",
             f."academicSessionId" AS "sessionId", s."name" AS "sessionName",
             f."academicTermId" AS "termId", t."name" AS "termName"
      FROM "FeeStructure" f
      INNER JOIN "AcademicSession" s ON s."id" = f."academicSessionId" AND s."schoolId" = f."schoolId"
      INNER JOIN "AcademicTerm" t ON t."id" = f."academicTermId" AND t."academicSessionId" = f."academicSessionId"
      WHERE f."schoolId" = ${schoolId}::uuid AND f."isActive" = true
      ORDER BY s."startsAt" DESC, t."order", f."name"
    `),
    db.$queryRaw<Array<{ id: string; admissionNumber: string; firstName: string; lastName: string }>>(Prisma.sql`
      SELECT st."id", st."admissionNumber", st."firstName", st."lastName"
      FROM "Student" st
      WHERE st."schoolId" = ${schoolId}::uuid AND st."status" = 'ACTIVE'
      ORDER BY st."lastName", st."firstName"
    `),
  ]);
  return {
    fees: fees.map((fee) => ({ ...fee, amount: Number(fee.amount) })),
    students,
  };
}

export async function assignFeeToStudent(schoolId: string, studentId: string, feeStructureId: string, actorUserId: string) {
  const context = await db.$queryRaw<Array<{
    studentId: string; studentName: string; feeId: string; feeName: string; amount: string; sessionId: string; termId: string;
  }>>(Prisma.sql`
    SELECT st."id" AS "studentId",
           CONCAT_WS(' ', st."firstName", st."middleName", st."lastName") AS "studentName",
           f."id" AS "feeId", f."name" AS "feeName", f."amount"::text AS "amount",
           f."academicSessionId" AS "sessionId", f."academicTermId" AS "termId"
    FROM "Student" st
    INNER JOIN "FeeStructure" f ON f."schoolId" = st."schoolId"
    WHERE st."id" = ${studentId}::uuid
      AND st."schoolId" = ${schoolId}::uuid
      AND f."id" = ${feeStructureId}::uuid
      AND f."isActive" = true
    LIMIT 1
  `);
  const row = context[0];
  if (!row) throw new StudentFeeAssignmentValidationError("Student and fee must belong to this school, and the fee must be active.");

  const enrollment = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT e."id"
    FROM "Enrollment" e
    WHERE e."studentId" = ${studentId}::uuid
      AND e."academicSessionId" = ${row.sessionId}::uuid
      AND e."status" = 'ACTIVE'
    LIMIT 1
  `);
  if (!enrollment.length) throw new StudentFeeAssignmentValidationError("Student must have an active enrollment in the fee's academic session.");

  const id = crypto.randomUUID();
  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "StudentFeeAssignment"
        WHERE "schoolId" = ${schoolId}::uuid AND "studentId" = ${studentId}::uuid AND "feeStructureId" = ${feeStructureId}::uuid
        LIMIT 1
      `);
      if (existing.length) throw new StudentFeeAssignmentConflictError("This fee is already assigned to this student.");

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "StudentFeeAssignment" ("id", "schoolId", "studentId", "feeStructureId", "amount", "assignedAt", "createdAt", "updatedAt")
        VALUES (${id}::uuid, ${schoolId}::uuid, ${studentId}::uuid, ${feeStructureId}::uuid, ${Number(row.amount)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      await tx.auditEvent.create({
        data: {
          schoolId, actorUserId, action: "finance.student_fee_assigned", entityType: "StudentFeeAssignment", entityId: id,
          currentState: { studentId, feeStructureId, feeName: row.feeName, amount: Number(row.amount), academicSessionId: row.sessionId, academicTermId: row.termId },
        },
      });

      return { id, studentId, feeStructureId, studentName: row.studentName, feeName: row.feeName, amount: Number(row.amount) };
    });
  } catch (error) {
    if (error instanceof StudentFeeAssignmentConflictError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new StudentFeeAssignmentConflictError("This fee is already assigned to this student.");
    }
    throw error;
  }
}
