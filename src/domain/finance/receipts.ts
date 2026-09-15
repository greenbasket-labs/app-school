import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export class ReceiptNotFoundError extends Error {}

export async function getPaymentReceipt(schoolId: string, paymentId: string) {
  const rows = await db.$queryRaw<Array<{
    paymentId: string;
    invoiceId: string;
    studentId: string;
    amount: string;
    paidAt: string;
    reference: string | null;
    note: string | null;
    feeName: string;
    invoiceAmount: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    schoolName: string;
    schoolAddress: string | null;
    schoolPhone: string | null;
    schoolEmail: string | null;
  }>>(Prisma.sql`
    SELECT
      p."id" AS "paymentId", p."invoiceId", p."studentId", p."amount"::text AS "amount",
      p."paidAt"::text AS "paidAt", p."reference", p."note",
      i."feeName", i."amount"::text AS "invoiceAmount",
      st."admissionNumber", st."firstName", st."lastName",
      s."name" AS "schoolName", s."address" AS "schoolAddress",
      s."phone" AS "schoolPhone", s."email" AS "schoolEmail"
    FROM "PaymentRecord" p
    INNER JOIN "StudentFeeInvoice" i ON i."id" = p."invoiceId" AND i."schoolId" = p."schoolId"
    INNER JOIN "Student" st ON st."id" = p."studentId" AND st."schoolId" = p."schoolId"
    INNER JOIN "School" s ON s."id" = p."schoolId"
    WHERE p."id" = ${paymentId}::uuid AND p."schoolId" = ${schoolId}::uuid
    LIMIT 1
  `);
  const row = rows[0];
  if (!row) throw new ReceiptNotFoundError("Payment receipt was not found in this school.");

  const paidBefore = await db.$queryRaw<Array<{ total: string }>>(Prisma.sql`
    SELECT COALESCE(SUM("amount"), 0)::text AS "total"
    FROM "PaymentRecord"
    WHERE "invoiceId" = ${row.invoiceId}::uuid
      AND "schoolId" = ${schoolId}::uuid
      AND "paidAt" < ${row.paidAt}::timestamptz
  `);

  const balanceAfter = Number(row.invoiceAmount) - Number(paidBefore[0]?.total ?? 0) - Number(row.amount);
  return {
    receiptNumber: `GB-${row.paymentId.slice(0, 8).toUpperCase()}`,
    paymentId: row.paymentId,
    invoiceId: row.invoiceId,
    paidAt: row.paidAt,
    amount: row.amount,
    reference: row.reference,
    note: row.note,
    feeName: row.feeName,
    invoiceAmount: row.invoiceAmount,
    balanceAfter: Math.max(0, balanceAfter),
    student: {
      admissionNumber: row.admissionNumber,
      name: `${row.firstName} ${row.lastName}`,
    },
    school: {
      name: row.schoolName,
      address: row.schoolAddress,
      phone: row.schoolPhone,
      email: row.schoolEmail,
    },
  };
}
