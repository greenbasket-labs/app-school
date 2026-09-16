import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { allocateResultRevenue, getCommercialPlan, type CommercialPlanCode } from "./plans";

export class ResultAccessTransactionError extends Error {}

export type VerifiedResultPayment = {
  paymentAttemptId: string;
  providerReference: string;
  amountNaira: number;
  currency: "NGN";
  providerFeeNaira?: number | null;
  verifiedAt?: Date;
};

export async function recordVerifiedResultPayment(input: VerifiedResultPayment) {
  if (!Number.isFinite(input.amountNaira) || input.amountNaira <= 0) {
    throw new ResultAccessTransactionError("Verified result payment amount must be positive.");
  }
  if (!input.providerReference.trim()) {
    throw new ResultAccessTransactionError("Provider reference is required.");
  }
  if (input.providerFeeNaira != null && (!Number.isFinite(input.providerFeeNaira) || input.providerFeeNaira < 0)) {
    throw new ResultAccessTransactionError("Provider fee must be a non-negative finite amount.");
  }

  return db.$transaction(async (tx) => {
    const attempts = await tx.$queryRaw<Array<{
      id: string;
      schoolId: string;
      studentId: string;
      academicSessionId: string;
      academicTermId: string;
      amount: string;
      currency: string;
      provider: string;
      providerReference: string | null;
      status: string;
    }>>(Prisma.sql`
      SELECT "id", "schoolId", "studentId", "academicSessionId", "academicTermId",
             "amount"::text AS "amount", "currency", "provider", "providerReference", "status"
      FROM "ResultPaymentAttempt"
      WHERE "id" = ${input.paymentAttemptId}::uuid
      FOR UPDATE
    `);
    const attempt = attempts[0];
    if (!attempt) throw new ResultAccessTransactionError("Result payment attempt was not found.");

    if (attempt.status === "SUCCEEDED") {
      const existing = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "ResultAccessTransaction"
        WHERE "paymentAttemptId" = ${attempt.id}::uuid
        LIMIT 1
      `);
      if (existing[0]) return { duplicate: true, transactionId: existing[0].id } as const;
    }

    if (attempt.status !== "INITIALIZED" && attempt.status !== "PENDING") {
      throw new ResultAccessTransactionError("This result payment attempt is not payable.");
    }
    if (attempt.providerReference && attempt.providerReference !== input.providerReference) {
      throw new ResultAccessTransactionError("Provider reference does not match the payment attempt.");
    }
    if (attempt.currency !== input.currency || Number(attempt.amount) !== Number(input.amountNaira)) {
      throw new ResultAccessTransactionError("Verified payment amount or currency does not match the payment attempt.");
    }

    // Snapshot the commercial plan through the same transaction client. This keeps
    // plan/share selection atomic with the immutable transaction ledger write.
    const existingSubscription = await tx.schoolSubscription.findUnique({
      where: { schoolId: attempt.schoolId },
      select: { planCode: true, status: true },
    });
    const subscription = existingSubscription ?? await tx.schoolSubscription.create({
      data: { schoolId: attempt.schoolId, planCode: "FREE", billingPeriod: "MONTHLY", status: "ACTIVE" },
      select: { planCode: true, status: true },
    });
    if (subscription.status === "CANCELED" || subscription.status === "PAUSED") {
      throw new ResultAccessTransactionError("School commercial subscription is inactive.");
    }

    const planCode = subscription.planCode as CommercialPlanCode;
    const plan = getCommercialPlan(planCode);
    const allocation = allocateResultRevenue(input.amountNaira, planCode);
    const providerFee = input.providerFeeNaira == null ? null : Number(input.providerFeeNaira.toFixed(2));
    const netAmount = providerFee == null ? null : Number((input.amountNaira - providerFee).toFixed(2));
    if (netAmount != null && netAmount < 0) {
      throw new ResultAccessTransactionError("Provider fee cannot exceed the verified gross amount.");
    }

    const transactionId = crypto.randomUUID();
    const allocationId = crypto.randomUUID();
    const verifiedAt = input.verifiedAt ?? new Date();

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "ResultAccessTransaction"
        ("id", "schoolId", "studentId", "academicSessionId", "academicTermId", "paymentAttemptId",
         "provider", "providerReference", "grossAmount", "providerFee", "netAmount", "currency",
         "planCode", "planSchoolSharePercent", "planAppSchoolSharePercent", "verifiedAt", "createdAt")
      VALUES
        (${transactionId}::uuid, ${attempt.schoolId}::uuid, ${attempt.studentId}::uuid,
         ${attempt.academicSessionId}::uuid, ${attempt.academicTermId}::uuid, ${attempt.id}::uuid,
         ${attempt.provider}, ${input.providerReference}, ${input.amountNaira}, ${providerFee}, ${netAmount}, ${input.currency},
         ${plan.code}, ${plan.resultSchoolSharePercent}, ${plan.resultAppSchoolSharePercent}, ${verifiedAt}, CURRENT_TIMESTAMP)
      ON CONFLICT ("paymentAttemptId") DO NOTHING
    `);

    const inserted = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "ResultAccessTransaction"
      WHERE "paymentAttemptId" = ${attempt.id}::uuid
      LIMIT 1
    `);
    const transaction = inserted[0];
    if (!transaction) throw new ResultAccessTransactionError("Verified result transaction could not be persisted.");

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "ResultRevenueAllocation"
        ("id", "transactionId", "grossAmount", "schoolShare", "appSchoolShare", "createdAt")
      VALUES
        (${allocationId}::uuid, ${transaction.id}::uuid, ${allocation.grossAmount}, ${allocation.schoolShare}, ${allocation.appSchoolShare}, CURRENT_TIMESTAMP)
      ON CONFLICT ("transactionId") DO NOTHING
    `);

    await tx.$executeRaw(Prisma.sql`
      UPDATE "ResultPaymentAttempt"
      SET "status" = 'SUCCEEDED', "providerReference" = ${input.providerReference}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${attempt.id}::uuid
    `);

    return {
      duplicate: false,
      transactionId: transaction.id,
      schoolId: attempt.schoolId,
      studentId: attempt.studentId,
      grossAmount: allocation.grossAmount,
      schoolShare: allocation.schoolShare,
      appSchoolShare: allocation.appSchoolShare,
      planCode: plan.code,
      providerFee,
      netAmount,
    } as const;
  });
}
