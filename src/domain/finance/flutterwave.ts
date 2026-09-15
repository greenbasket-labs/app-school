import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnabledSchoolPaymentProvider } from "@/domain/finance/payment-providers";

const FLUTTERWAVE_API = "https://api.flutterwave.com/v3";
const PROVIDER = "FLUTTERWAVE" as const;

export class FlutterwavePaymentError extends Error {}

function secretKey() {
  const value = process.env.FLW_SECRET_KEY;
  if (!value) throw new FlutterwavePaymentError("FLW_SECRET_KEY is not configured.");
  return value;
}

function secretHash() {
  const value = process.env.FLW_SECRET_HASH;
  if (!value) throw new FlutterwavePaymentError("FLW_SECRET_HASH is not configured.");
  return value;
}

function baseUrl() {
  const value = process.env.APP_BASE_URL;
  if (!value) throw new FlutterwavePaymentError("APP_BASE_URL is not configured.");
  return value.replace(/\/$/, "");
}

function reference() {
  return `GBS-FLW-${Date.now()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export function verifyFlutterwaveSignature(signature: string | null) {
  if (!signature) return false;
  const expected = secretHash();
  const supplied = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return supplied.length === expectedBuffer.length && timingSafeEqual(supplied, expectedBuffer);
}

export async function initializeFlutterwavePayment(
  schoolId: string,
  invoiceId: string,
  payerEmail: string,
  payerName?: string,
) {
  const provider = await getEnabledSchoolPaymentProvider(schoolId, PROVIDER);
  const settlement = provider[0];
  if (!settlement) throw new FlutterwavePaymentError("Flutterwave is not configured for this school.");

  const invoice = await db.$queryRaw<Array<{
    studentId: string;
    amount: string;
    status: string;
    feeName: string;
  }>>(Prisma.sql`
    SELECT "studentId", "amount"::text AS "amount", "status", "feeName"
    FROM "StudentFeeInvoice"
    WHERE "id" = ${invoiceId}::uuid AND "schoolId" = ${schoolId}::uuid
    LIMIT 1
  `);
  const row = invoice[0];
  if (!row) throw new FlutterwavePaymentError("Invoice was not found in this school.");
  if (row.status !== "OPEN") throw new FlutterwavePaymentError("This invoice cannot accept an online payment.");

  const paid = await db.$queryRaw<Array<{ total: string }>>(Prisma.sql`
    SELECT COALESCE(SUM("amount"), 0)::text AS "total"
    FROM "PaymentRecord"
    WHERE "invoiceId" = ${invoiceId}::uuid AND "schoolId" = ${schoolId}::uuid
  `);
  const outstanding = Number(row.amount) - Number(paid[0]?.total ?? 0);
  if (outstanding <= 0) throw new FlutterwavePaymentError("This invoice is already fully paid.");

  const intentId = crypto.randomUUID();
  const txRef = reference();

  await db.$executeRaw(Prisma.sql`
    INSERT INTO "PaymentIntent"
      ("id", "schoolId", "invoiceId", "provider", "reference", "amount", "currency", "status", "createdAt", "updatedAt")
    VALUES
      (${intentId}::uuid, ${schoolId}::uuid, ${invoiceId}::uuid, ${PROVIDER}, ${txRef}, ${outstanding}, 'NGN', 'INITIALIZED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  try {
    const response = await fetch(`${FLUTTERWAVE_API}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: outstanding,
        currency: "NGN",
        redirect_url: `${baseUrl()}/api/schools/${schoolId}/finance/payments/flutterwave/callback`,
        customer: { email: payerEmail, name: payerName || "App-School payer" },
        subaccounts: [{ id: settlement.settlementAccountReference }],
        meta: { paymentIntentId: intentId, schoolId, invoiceId, studentId: row.studentId },
      }),
    });

    const data = await response.json() as {
      status?: string;
      message?: string;
      data?: { link?: string; id?: number; tx_ref?: string };
    };
    if (!response.ok || data.status !== "success" || !data.data?.link) {
      throw new FlutterwavePaymentError(data.message ?? "Flutterwave payment initialization failed.");
    }

    await db.$executeRaw(Prisma.sql`
      UPDATE "PaymentIntent"
      SET "checkoutUrl" = ${data.data.link}, "providerTransactionId" = ${data.data.id ? String(data.data.id) : null}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${intentId}::uuid
    `);

    return {
      paymentIntentId: intentId,
      provider: PROVIDER,
      reference: txRef,
      amount: outstanding,
      currency: "NGN",
      checkoutUrl: data.data.link,
    };
  } catch (error) {
    await db.$executeRaw(Prisma.sql`
      UPDATE "PaymentIntent" SET "status" = 'FAILED', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${intentId}::uuid
    `);
    throw error;
  }
}

export async function handleFlutterwaveChargeCompleted(event: {
  id: number;
  tx_ref: string;
  status: string;
}) {
  if (event.status !== "successful") return { handled: true, ignored: true } as const;

  const verifyResponse = await fetch(`${FLUTTERWAVE_API}/transactions/${encodeURIComponent(event.id)}/verify`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const verified = await verifyResponse.json() as {
    status?: string;
    data?: { id?: number; tx_ref?: string; status?: string; amount?: number; currency?: string };
  };
  if (!verifyResponse.ok || verified.status !== "success" || !verified.data) {
    throw new FlutterwavePaymentError("Flutterwave transaction verification failed.");
  }

  const tx = verified.data;
  if (tx.status !== "successful" || tx.tx_ref !== event.tx_ref || tx.id !== event.id || tx.currency !== "NGN") {
    return { handled: false, reason: "PROVIDER_VERIFICATION_MISMATCH" } as const;
  }

  return db.$transaction(async (dbTx) => {
    const intents = await dbTx.$queryRaw<Array<{
      id: string; schoolId: string; invoiceId: string; amount: string; status: string;
    }>>(Prisma.sql`
      SELECT "id", "schoolId", "invoiceId", "amount"::text AS "amount", "status"
      FROM "PaymentIntent"
      WHERE "provider" = ${PROVIDER} AND "reference" = ${event.tx_ref}
      FOR UPDATE
    `);
    const intent = intents[0];
    if (!intent) return { handled: false, reason: "UNKNOWN_REFERENCE" } as const;
    if (intent.status === "SUCCESS") return { handled: true, duplicate: true, paymentIntentId: intent.id } as const;

    if (Number(tx.amount) !== Number(intent.amount)) {
      await dbTx.$executeRaw(Prisma.sql`UPDATE "PaymentIntent" SET "status" = 'FAILED', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${intent.id}::uuid`);
      return { handled: false, reason: "AMOUNT_MISMATCH" } as const;
    }

    const invoices = await dbTx.$queryRaw<Array<{ studentId: string; amount: string; status: string }>>(Prisma.sql`
      SELECT "studentId", "amount"::text AS "amount", "status"
      FROM "StudentFeeInvoice"
      WHERE "id" = ${intent.invoiceId}::uuid AND "schoolId" = ${intent.schoolId}::uuid
      FOR UPDATE
    `);
    const invoice = invoices[0];
    if (!invoice || invoice.status !== "OPEN") return { handled: false, reason: "INVOICE_NOT_PAYABLE" } as const;

    const paid = await dbTx.$queryRaw<Array<{ total: string }>>(Prisma.sql`
      SELECT COALESCE(SUM("amount"), 0)::text AS "total"
      FROM "PaymentRecord"
      WHERE "invoiceId" = ${intent.invoiceId}::uuid AND "schoolId" = ${intent.schoolId}::uuid
    `);
    const outstanding = Number(invoice.amount) - Number(paid[0]?.total ?? 0);
    if (Number(intent.amount) > outstanding) return { handled: false, reason: "OUTSTANDING_BALANCE_CHANGED" } as const;

    const paymentId = crypto.randomUUID();
    await dbTx.$executeRaw(Prisma.sql`
      INSERT INTO "PaymentRecord"
        ("id", "schoolId", "studentId", "invoiceId", "amount", "paidAt", "reference", "note", "recordedByUserId", "createdAt", "updatedAt")
      VALUES
        (${paymentId}::uuid, ${intent.schoolId}::uuid, ${invoice.studentId}::uuid, ${intent.invoiceId}::uuid,
         ${Number(intent.amount)}, CURRENT_TIMESTAMP, ${event.tx_ref}, 'Flutterwave charge.completed', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    await dbTx.$executeRaw(Prisma.sql`
      UPDATE "PaymentIntent"
      SET "status" = 'SUCCESS', "providerTransactionId" = ${String(event.id)}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${intent.id}::uuid
    `);

    return { handled: true, duplicate: false, paymentIntentId: intent.id, paymentId } as const;
  });
}
