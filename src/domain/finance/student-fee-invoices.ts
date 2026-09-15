import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export class StudentFeeInvoiceValidationError extends Error {
  constructor(message: string) { super(message); this.name = "StudentFeeInvoiceValidationError"; }
}

export class StudentFeeInvoiceConflictError extends Error {
  constructor(message: string) { super(message); this.name = "StudentFeeInvoiceConflictError"; }
}

export async function listStudentFeeInvoices(schoolId: string) {
  return db.$queryRaw<Array<{
    id: string;
    studentId: string;
    studentFeeAssignmentId: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    feeName: string;
    amount: string;
    dueDate: string | null;
    status: string;
    issuedAt: Date;
  }>>(Prisma.sql`
    SELECT i."id", i."studentId", i."studentFeeAssignmentId",
           st."admissionNumber", st."firstName", st."lastName",
           i."feeName", i."amount"::text AS "amount",
           i."dueDate"::text AS "dueDate", i."status", i."issuedAt"
    FROM "StudentFeeInvoice" i
    INNER JOIN "Student" st ON st."id" = i."studentId" AND st."schoolId" = i."schoolId"
    WHERE i."schoolId" = ${schoolId}::uuid
    ORDER BY i."issuedAt" DESC
  `);
}

export async function listUninvoicedFeeAssignments(schoolId: string) {
  return db.$queryRaw<Array<{
    id: string;
    studentId: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    feeName: string;
    amount: string;
    dueDate: string | null;
  }>>(Prisma.sql`
    SELECT a."id", a."studentId", st."admissionNumber", st."firstName", st."lastName",
           f."name" AS "feeName", a."amount"::text AS "amount",
           f."dueDate"::text AS "dueDate"
    FROM "StudentFeeAssignment" a
    INNER JOIN "Student" st ON st."id" = a."studentId" AND st."schoolId" = a."schoolId"
    INNER JOIN "FeeStructure" f ON f."id" = a."feeStructureId" AND f."schoolId" = a."schoolId"
    LEFT JOIN "StudentFeeInvoice" i ON i."studentFeeAssignmentId" = a."id"
    WHERE a."schoolId" = ${schoolId}::uuid AND i."id" IS NULL
    ORDER BY st."lastName", st."firstName", f."name"
  `);
}

export async function createStudentFeeInvoice(schoolId: string, studentFeeAssignmentId: string, actorUserId: string) {
  const context = await db.$queryRaw<Array<{
    assignmentId: string;
    studentId: string;
    studentName: string;
    feeName: string;
    amount: string;
    dueDate: string | null;
  }>>(Prisma.sql`
    SELECT a."id" AS "assignmentId", st."id" AS "studentId",
           CONCAT_WS(' ', st."firstName", st."middleName", st."lastName") AS "studentName",
           f."name" AS "feeName", a."amount"::text AS "amount", f."dueDate"::text AS "dueDate"
    FROM "StudentFeeAssignment" a
    INNER JOIN "Student" st ON st."id" = a."studentId" AND st."schoolId" = a."schoolId"
    INNER JOIN "FeeStructure" f ON f."id" = a."feeStructureId" AND f."schoolId" = a."schoolId"
    WHERE a."id" = ${studentFeeAssignmentId}::uuid AND a."schoolId" = ${schoolId}::uuid
    LIMIT 1
  `);

  const row = context[0];
  if (!row) throw new StudentFeeInvoiceValidationError("Fee assignment does not belong to this school.");

  const existing = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "StudentFeeInvoice"
    WHERE "schoolId" = ${schoolId}::uuid AND "studentFeeAssignmentId" = ${studentFeeAssignmentId}::uuid
    LIMIT 1
  `);
  if (existing.length) throw new StudentFeeInvoiceConflictError("This fee assignment already has an invoice.");

  const id = crypto.randomUUID();

  try {
    return await db.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "StudentFeeInvoice"
          ("id", "schoolId", "studentId", "studentFeeAssignmentId", "feeName", "amount", "dueDate", "status", "issuedAt", "createdAt", "updatedAt")
        VALUES
          (${id}::uuid, ${schoolId}::uuid, ${row.studentId}::uuid, ${row.assignmentId}::uuid,
           ${row.feeName}, ${Number(row.amount)},
           ${row.dueDate ? new Date(`${row.dueDate}T00:00:00.000Z`) : null},
           'OPEN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      await tx.auditEvent.create({
        data: {
          schoolId,
          actorUserId,
          action: "finance.student_fee_invoice_created",
          entityType: "StudentFeeInvoice",
          entityId: id,
          currentState: {
            studentId: row.studentId,
            studentFeeAssignmentId: row.assignmentId,
            feeName: row.feeName,
            amount: Number(row.amount),
            dueDate: row.dueDate,
            status: "OPEN",
          },
        },
      });

      return {
        id,
        studentId: row.studentId,
        studentName: row.studentName,
        studentFeeAssignmentId: row.assignmentId,
        feeName: row.feeName,
        amount: Number(row.amount),
        dueDate: row.dueDate,
        status: "OPEN",
      };
    });
  } catch (error) {
    if (error instanceof StudentFeeInvoiceConflictError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new StudentFeeInvoiceConflictError("This fee assignment already has an invoice.");
    }
    throw error;
  }
}
