import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export class ResultAccessEntitlementError extends Error {}

export type ResultAccessEntitlement = {
  id: string;
  schoolId: string;
  studentId: string;
  academicSessionId: string;
  academicTermId: string;
  transactionId: string;
  grantedAt: Date;
};

type EntitlementDb = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">;

function requireId(value: string, name: string) {
  const normalized = value.trim();
  if (!normalized) throw new ResultAccessEntitlementError(`${name} is required.`);
  return normalized;
}

/**
 * Grants result access only from an already persisted verified commercial
 * transaction. The transaction is the economic proof; the entitlement is the
 * durable access proof.
 */
export async function grantResultAccessEntitlement(
  input: { transactionId: string },
  client: EntitlementDb = db,
): Promise<ResultAccessEntitlement> {
  const transactionId = requireId(input.transactionId, "transactionId");

  const transactions = await client.$queryRaw<Array<{
    id: string;
    schoolId: string;
    studentId: string;
    academicSessionId: string;
    academicTermId: string;
  }>>(Prisma.sql`
    SELECT "id", "schoolId", "studentId", "academicSessionId", "academicTermId"
    FROM "ResultAccessTransaction"
    WHERE "id" = ${transactionId}::uuid
    LIMIT 1
  `);

  const transaction = transactions[0];
  if (!transaction) {
    throw new ResultAccessEntitlementError("Verified result transaction was not found.");
  }

  const id = crypto.randomUUID();
  await client.$executeRaw(Prisma.sql`
    INSERT INTO "ResultAccessEntitlement"
      ("id", "schoolId", "studentId", "academicSessionId", "academicTermId", "transactionId", "grantedAt")
    VALUES
      (${id}::uuid, ${transaction.schoolId}::uuid, ${transaction.studentId}::uuid,
       ${transaction.academicSessionId}::uuid, ${transaction.academicTermId}::uuid,
       ${transaction.id}::uuid, CURRENT_TIMESTAMP)
    ON CONFLICT ("schoolId", "studentId", "academicSessionId", "academicTermId") DO NOTHING
  `);

  const entitlements = await client.$queryRaw<Array<ResultAccessEntitlement>>(Prisma.sql`
    SELECT "id", "schoolId", "studentId", "academicSessionId", "academicTermId", "transactionId", "grantedAt"
    FROM "ResultAccessEntitlement"
    WHERE "schoolId" = ${transaction.schoolId}::uuid
      AND "studentId" = ${transaction.studentId}::uuid
      AND "academicSessionId" = ${transaction.academicSessionId}::uuid
      AND "academicTermId" = ${transaction.academicTermId}::uuid
    LIMIT 1
  `);

  if (!entitlements[0]) {
    throw new ResultAccessEntitlementError("Result access entitlement could not be persisted.");
  }

  return entitlements[0];
}

export async function hasResultAccessEntitlement(input: {
  schoolId: string;
  studentId: string;
  academicSessionId: string;
  academicTermId: string;
}, client: EntitlementDb = db): Promise<boolean> {
  const schoolId = requireId(input.schoolId, "schoolId");
  const studentId = requireId(input.studentId, "studentId");
  const academicSessionId = requireId(input.academicSessionId, "academicSessionId");
  const academicTermId = requireId(input.academicTermId, "academicTermId");

  const rows = await client.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "ResultAccessEntitlement"
    WHERE "schoolId" = ${schoolId}::uuid
      AND "studentId" = ${studentId}::uuid
      AND "academicSessionId" = ${academicSessionId}::uuid
      AND "academicTermId" = ${academicTermId}::uuid
    LIMIT 1
  `);

  return Boolean(rows[0]);
}
