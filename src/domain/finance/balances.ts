import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function listInvoiceBalances(schoolId: string) {
  return db.$queryRaw<Array<{
    invoiceId: string;
    studentId: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    feeName: string;
    invoiceAmount: string;
    paidAmount: string;
    outstanding: string;
    dueDate: string | null;
    status: string;
  }>>(Prisma.sql`
    SELECT i."id" AS "invoiceId", i."studentId", st."admissionNumber", st."firstName", st."lastName",
      i."feeName", i."amount"::text AS "invoiceAmount",
      COALESCE((SELECT SUM(p."amount") FROM "PaymentRecord" p WHERE p."invoiceId" = i."id" AND p."schoolId" = i."schoolId"), 0)::text AS "paidAmount",
      GREATEST(i."amount" - COALESCE((SELECT SUM(p."amount") FROM "PaymentRecord" p WHERE p."invoiceId" = i."id" AND p."schoolId" = i."schoolId"), 0), 0)::text AS "outstanding",
      i."dueDate"::text AS "dueDate", i."status"
    FROM "StudentFeeInvoice" i
    INNER JOIN "Student" st ON st."id" = i."studentId" AND st."schoolId" = i."schoolId"
    WHERE i."schoolId" = ${schoolId}::uuid
    ORDER BY st."lastName", st."firstName", i."issuedAt" DESC
  `);
}

export async function getFinanceReconciliation(schoolId: string) {
  const rows = await db.$queryRaw<Array<{ invoiceCount: bigint; invoiced: string; paid: string; outstanding: string; paymentCount: bigint }>>(Prisma.sql`
    SELECT
      COUNT(DISTINCT i."id") AS "invoiceCount",
      COALESCE(SUM(i."amount"), 0)::text AS "invoiced",
      COALESCE((SELECT SUM(p."amount") FROM "PaymentRecord" p WHERE p."schoolId" = ${schoolId}::uuid), 0)::text AS "paid",
      COALESCE(SUM(GREATEST(i."amount" - COALESCE((SELECT SUM(p2."amount") FROM "PaymentRecord" p2 WHERE p2."invoiceId" = i."id" AND p2."schoolId" = i."schoolId"), 0), 0)), 0)::text AS "outstanding",
      (SELECT COUNT(*) FROM "PaymentRecord" p WHERE p."schoolId" = ${schoolId}::uuid) AS "paymentCount"
    FROM "StudentFeeInvoice" i
    WHERE i."schoolId" = ${schoolId}::uuid AND i."status" = 'OPEN'
  `);
  const row = rows[0];
  return {
    invoiceCount: Number(row?.invoiceCount ?? 0),
    paymentCount: Number(row?.paymentCount ?? 0),
    invoiced: Number(row?.invoiced ?? 0),
    paid: Number(row?.paid ?? 0),
    outstanding: Number(row?.outstanding ?? 0),
  };
}
