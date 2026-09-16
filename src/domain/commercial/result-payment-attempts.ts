import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  createResultPaymentAttempt,
  type ResultPaymentAttemptInput,
  type ResultPaymentProvider,
} from "./result-access-policy";

export type PersistedResultPaymentAttempt = {
  id: string;
  schoolId: string;
  studentId: string;
  academicSessionId: string;
  academicTermId: string;
  amountNaira: number;
  currency: "NGN";
  provider: ResultPaymentProvider;
  idempotencyKey: string;
  status: "PENDING" | "INITIALIZED" | "FAILED" | "SUCCEEDED";
  providerReference: string | null;
  checkoutUrl: string | null;
};

export class ResultPaymentAttemptConflictError extends Error {}

function mapAttempt(row: {
  id: string;
  schoolId: string;
  studentId: string;
  academicSessionId: string;
  academicTermId: string;
  amount: string;
  currency: string;
  provider: ResultPaymentProvider;
  idempotencyKey: string;
  status: PersistedResultPaymentAttempt["status"];
  providerReference: string | null;
  checkoutUrl: string | null;
}): PersistedResultPaymentAttempt {
  return {
    id: row.id,
    schoolId: row.schoolId,
    studentId: row.studentId,
    academicSessionId: row.academicSessionId,
    academicTermId: row.academicTermId,
    amountNaira: Number(row.amount),
    currency: "NGN",
    provider: row.provider,
    idempotencyKey: row.idempotencyKey,
    status: row.status,
    providerReference: row.providerReference,
    checkoutUrl: row.checkoutUrl,
  };
}

/**
 * Persists one logical paid-result attempt.
 *
 * The school-scoped idempotency key is the retry boundary. A repeated request
 * with the same key returns the existing attempt only when its immutable
 * payment context matches. It never creates a second attempt.
 */
export async function createOrGetResultPaymentAttempt(
  input: ResultPaymentAttemptInput,
): Promise<PersistedResultPaymentAttempt> {
  const attempt = createResultPaymentAttempt(input);
  const id = crypto.randomUUID();

  await db.$executeRaw(Prisma.sql`
    INSERT INTO "ResultPaymentAttempt"
      ("id", "schoolId", "studentId", "academicSessionId", "academicTermId", "amount", "currency", "provider", "idempotencyKey", "status", "createdAt", "updatedAt")
    VALUES
      (${id}::uuid, ${attempt.schoolId}::uuid, ${attempt.studentId}::uuid,
       ${attempt.academicSessionId}::uuid, ${attempt.academicTermId}::uuid,
       ${attempt.amountNaira}, 'NGN', ${attempt.provider}, ${attempt.idempotencyKey},
       'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("schoolId", "idempotencyKey") DO NOTHING
  `);

  const rows = await db.$queryRaw<Array<{
    id: string;
    schoolId: string;
    studentId: string;
    academicSessionId: string;
    academicTermId: string;
    amount: string;
    currency: string;
    provider: ResultPaymentProvider;
    idempotencyKey: string;
    status: PersistedResultPaymentAttempt["status"];
    providerReference: string | null;
    checkoutUrl: string | null;
  }>>(Prisma.sql`
    SELECT
      "id", "schoolId", "studentId", "academicSessionId", "academicTermId",
      "amount"::text AS "amount", "currency", "provider", "idempotencyKey",
      "status", "providerReference", "checkoutUrl"
    FROM "ResultPaymentAttempt"
    WHERE "schoolId" = ${attempt.schoolId}::uuid
      AND "idempotencyKey" = ${attempt.idempotencyKey}
    LIMIT 1
  `);

  const existing = rows[0];
  if (!existing) throw new Error("Result payment attempt could not be persisted.");

  const sameContext =
    existing.studentId === attempt.studentId &&
    existing.academicSessionId === attempt.academicSessionId &&
    existing.academicTermId === attempt.academicTermId &&
    Number(existing.amount) === attempt.amountNaira &&
    existing.provider === attempt.provider;

  if (!sameContext) {
    throw new ResultPaymentAttemptConflictError(
      "The idempotency key is already bound to a different result payment attempt.",
    );
  }

  return mapAttempt(existing);
}
