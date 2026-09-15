import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export class PaymentValidationError extends Error {}
export class PaymentConflictError extends Error {}

export async function listPayments(schoolId: string) {
  return db.$queryRaw<Array<{
    id: string; invoiceId: string; studentId: string; amount: string;
    paidAt: string; reference: string | null; note: string | null;
    admissionNumber: string; firstName: string; lastName: string; feeName: string;
  }>>(Prisma.sql`
    SELECT p."id", p."invoiceId", p."studentId", p."amount"::text AS "amount",
           p."paidAt"::text AS "paidAt", p."reference", p."note",
           st."admissionNumber", st."firstName", st."lastName", i."feeName"
    FROM "PaymentRecord" p
    INNER JOIN "Student" st ON st."id" = p."studentId" AND st."schoolId" = p."schoolId"
    INNER JOIN "Invoice" i ON i."id" = p."invoiceId" AND i."schoolId" = p."schoolId"
    WHERE p."schoolId" = ${schoolId}::uuid
    ORDER BY p."paidAt" DESC, p."createdAt" DESC
  `);
}

export async function getPaymentOptions(schoolId: string) {
  return db.$queryRaw<Array<{
    id: string; studentId: string; amount: string; paidAmount: string;
    feeName: string; admissionNumber: string; firstName: string; lastName: string;
  }>>(Prisma.sql`
    SELECT i."id", i."studentId", i."amount"::text AS "amount",
           COALESCE((SELECT SUM(p."amount") FROM "PaymentRecord" p WHERE p."invoiceId" = i."id" AND p."schoolId" = i."schoolId"), 0)::text AS "paidAmount",
           i."feeName", st."admissionNumber", st."firstName", st."lastName"
    FROM "Invoice" i
    INNER JOIN "Student" st ON st."id" = i."studentId" AND st."schoolId" = i."schoolId"
    WHERE i."schoolId" = ${schoolId}::uuid AND i."status" IN ('OPEN', 'PARTIALLY_PAID')
    ORDER BY st."lastName", st."firstName", i."createdAt" DESC
  `);
}

export async function recordPayment(
  schoolId: string,
  invoiceId: string,
  amount: number,
  actorUserId: string,
  reference?: string,
  note?: string,
) {
  if (!Number.isFinite(amount) || amount <= 0) throw new PaymentValidationError("Payment amount must be greater than zero.");

  const id = crypto.randomUUID();
  try {
    return await db.$transaction(async (tx) => {
      const invoices = await tx.$queryRaw<Array<{ studentId: string; invoiceAmount: string; status: string; feeName: string }>>(Prisma.sql`
        SELECT "studentId", "amount"::text AS "invoiceAmount", "status", "feeName"
        FROM "Invoice"
        WHERE "id" = ${invoiceId}::uuid AND "schoolId" = ${schoolId}::uuid
        FOR UPDATE
      `);
      const invoice = invoices[0];
      if (!invoice) throw new PaymentValidationError("Invoice was not found in this school.");
      if (invoice.status === "CANCELLED" || invoice.status === "PAID") throw new PaymentValidationError("This invoice cannot accept another payment.");

      const paid = await tx.$queryRaw<Array<{ total: string }>>(Prisma.sql`
        SELECT COALESCE(SUM("amount"), 0)::text AS "total"
        FROM "PaymentRecord"
        WHERE "invoiceId" = ${invoiceId}::uuid AND "schoolId" = ${schoolId}::uuid
      `);
      const alreadyPaid = Number(paid[0]?.total ?? 0);
      const invoiceAmount = Number(invoice.invoiceAmount);
      const outstanding = Math.max(0, invoiceAmount - alreadyPaid);
      if (amount > outstanding) throw new PaymentValidationError(`Payment exceeds the outstanding balance of ${outstanding.toFixed(2)}.`);

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "PaymentRecord" ("id", "schoolId", "studentId", "invoiceId", "amount", "paidAt", "reference", "note", "recordedByUserId", "createdAt", "updatedAt")
        VALUES (${id}::uuid, ${schoolId}::uuid, ${invoice.studentId}::uuid, ${invoiceId}::uuid, ${amount}, CURRENT_TIMESTAMP, ${reference ?? null}, ${note ?? null}, ${actorUserId}::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      const newPaid = alreadyPaid + amount;
      const newStatus = newPaid >= invoiceAmount ? "PAID" : "PARTIALLY_PAID";
      await tx.$executeRaw(Prisma.sql`
        UPDATE "Invoice" SET "status" = ${newStatus}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${invoiceId}::uuid AND "schoolId" = ${schoolId}::uuid
      `);

      await tx.auditEvent.create({
        data: {
          schoolId, actorUserId, action: "finance.payment_recorded", entityType: "PaymentRecord", entityId: id,
          currentState: { invoiceId, studentId: invoice.studentId, amount, reference: reference ?? null, invoiceStatus: newStatus },
        },
      });
      return { id, invoiceId, studentId: invoice.studentId, amount, newStatus, outstanding: invoiceAmount - newPaid };
    });
  } catch (error) {
    if (error instanceof PaymentValidationError) throw error;
    throw error;
  }
}
