import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export class InvoiceValidationError extends Error {}
export class InvoiceConflictError extends Error {}

export async function listInvoices(schoolId: string) {
  return db.$queryRaw<Array<{
    id: string; studentId: string; studentFeeAssignmentId: string; amount: string;
    feeName: string; dueDate: string | null; status: string;
    admissionNumber: string; firstName: string; lastName: string;
    paidAmount: string;
  }>>(Prisma.sql`
    SELECT i."id", i."studentId", i."studentFeeAssignmentId", i."amount"::text AS "amount",
           i."feeName", i."dueDate"::text AS "dueDate", i."status",
           st."admissionNumber", st."firstName", st."lastName",
           COALESCE((SELECT SUM(p."amount") FROM "PaymentRecord" p WHERE p."invoiceId" = i."id" AND p."schoolId" = i."schoolId"), 0)::text AS "paidAmount"
    FROM "Invoice" i
    INNER JOIN "Student" st ON st."id" = i."studentId" AND st."schoolId" = i."schoolId"
    WHERE i."schoolId" = ${schoolId}::uuid
    ORDER BY st."lastName", st."firstName", i."createdAt" DESC
  `);
}

export async function createInvoice(schoolId: string, studentFeeAssignmentId: string, actorUserId: string) {
  const rows = await db.$queryRaw<Array<{
    assignmentId: string; studentId: string; amount: string; feeName: string; dueDate: string | null;
  }>>(Prisma.sql`
    SELECT a."id" AS "assignmentId", a."studentId", a."amount"::text AS "amount",
           f."name" AS "feeName", f."dueDate"::text AS "dueDate"
    FROM "StudentFeeAssignment" a
    INNER JOIN "FeeStructure" f ON f."id" = a."feeStructureId" AND f."schoolId" = a."schoolId"
    WHERE a."id" = ${studentFeeAssignmentId}::uuid AND a."schoolId" = ${schoolId}::uuid
    LIMIT 1
  `);
  const source = rows[0];
  if (!source) throw new InvoiceValidationError("Student fee assignment was not found in this school.");

  const existing = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "Invoice" WHERE "studentFeeAssignmentId" = ${studentFeeAssignmentId}::uuid LIMIT 1
  `);
  if (existing.length) throw new InvoiceConflictError("This student fee assignment already has an invoice.");

  const id = crypto.randomUUID();
  try {
    return await db.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "Invoice" ("id", "schoolId", "studentId", "studentFeeAssignmentId", "amount", "feeName", "dueDate", "status", "createdAt", "updatedAt")
        VALUES (${id}::uuid, ${schoolId}::uuid, ${source.studentId}::uuid, ${source.assignmentId}::uuid, ${Number(source.amount)}, ${source.feeName}, ${source.dueDate}::date, 'OPEN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      await tx.auditEvent.create({
        data: {
          schoolId, actorUserId, action: "finance.invoice_created", entityType: "Invoice", entityId: id,
          currentState: { studentId: source.studentId, studentFeeAssignmentId, amount: Number(source.amount), feeName: source.feeName, dueDate: source.dueDate },
        },
      });
      return { id, studentId: source.studentId, studentFeeAssignmentId, amount: Number(source.amount), feeName: source.feeName, dueDate: source.dueDate, status: "OPEN" };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new InvoiceConflictError("This student fee assignment already has an invoice.");
    throw error;
  }
}
