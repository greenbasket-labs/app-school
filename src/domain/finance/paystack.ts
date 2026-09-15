import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnabledSchoolPaymentProvider } from "@/domain/finance/payment-providers";

const PAYSTACK_API = "https://api.paystack.co";
const PROVIDER = "PAYSTACK" as const;

export class PaystackPaymentError extends Error {}

function secretKey() {
  const value = process.env.PAYSTACK_SECRET_KEY;
  if (!value) throw new PaystackPaymentError("PAYSTACK_SECRET_KEY is not configured.");
  return value;
}

function baseUrl() {
  const value = process.env.APP_BASE_URL;
  if (!value) throw new PaystackPaymentError("APP_BASE_URL is not configured.");
  return value.replace(/\/$/, "");
}

function reference() {
  return `GBS-${Date.now()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const expected = createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const suppliedBuffer = Buffer.from(signature, "utf8");
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function initializePaystackPayment(
  schoolId: string,
  invoiceId: string,
  payerEmail: string,
) {
  const configured = await getEnabledSchoolPaymentProvider(schoolId, PROVIDER);
  const providerConfig = configured[0];
  if (!providerConfig) throw new PaystackPaymentError("Paystack is not configured for this school.");

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
  if (!row) throw new PaystackPaymentError("Invoice was not found in this school.");
  if (row.status !== "OPEN") throw new PaystackPaymentError("This invoice cannot accept an online payment.");

  const paid = await db.$queryRaw<Array<{ total: string }>>(Prisma.sql`
    SELECT COALESCE(SUM("amount"), 0)::text AS "total"
    FROM "PaymentRecord"
    WHERE "invoiceId" = ${invoiceId}::uuid AND "schoolId" = ${schoolId}::uuid
  `);
  const outstanding = Number(row.amount) - Number(paid[0]?.total ?? 0);
  if (outstanding <= 0) throw new PaystackPaymentError("This invoice is already fully paid.");

  const intentId = crypto.randomUUID();
  const transactionReference = reference();
  const amountNaira = outstanding;
  const amountKobo = Math.round(amountNaira * 100);

  await db.$executeRaw(Prisma.sql`
    INSERT INTO "PaymentIntent"
      ("id", "schoolId", "invoiceId", "provider", "reference", "amount", "currency", "status", "settlementAccountReference", "createdAt", "updatedAt")
    VALUES
      (${intentId}::uuid, ${schoolId}::uuid, ${invoiceId}::uuid, ${PROVIDER}, ${transactionReference}, ${amountNaira}, 'NGN', 'INITIALIZED', ${providerConfig.settlementAccountReference}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  try {
    const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: payerEmail,
        amount: String(amountKobo),
        currency: "NGN",
        reference: transactionReference,
        subaccount: providerConfig.settlementAccountReference,
        callback_url: `${baseUrl()}/api/schools/${schoolId}/finance/payments/paystack/callback`,
        metadata: JSON.stringify({
          paymentIntentId: intentId,
          schoolId,
          invoiceId,
          studentId: row.studentId,
          feeName: row.feeName,
        }),
      }),
    });

    const data = await response.json() as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; reference?: string };
    };
    if (!response.ok || !data.status || !data.data?.authorization_url || !data.data.reference) {
      throw new PaystackPaymentError(data.message ?? "Paystack transaction initialization failed.");
    }

    await db.$executeRaw(Prisma.sql`
      UPDATE "PaymentIntent"
      SET "reference" = ${data.data.reference}, "checkoutUrl" = ${data.data.authorization_url}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${intentId}::uuid
    `);

    return {
      paymentIntentId: intentId,
      provider: PROVIDER,
      reference: data.data.reference,
      amount: amountNaira,
      currency: "NGN",
      checkoutUrl: data.data.authorization_url,
      settlementAccountReference: providerConfig.settlementAccountReference,
    };
  } catch (error) {
    await db.$executeRaw(Prisma.sql`
      UPDATE "PaymentIntent" SET "status" = 'FAILED', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${intentId}::uuid
    `);
    throw error;
  }
}

export async function handlePaystackChargeSuccess(event: {
  reference: string;
  amount: number;
  currency?: string;
  id?: number;
}) {
  return db.$transaction(async (tx) => {
    const intents = await tx.$queryRaw<Array<{
      id: string;
      schoolId: string;
      invoiceId: string;
      amount: string;
      status: string;
      settlementAccountReference: string | null;
    }>>(Prisma.sql`
      SELECT "id", "schoolId", "invoiceId", "amount"::text AS "amount", "status", "settlementAccountReference"
      FROM "PaymentIntent"
      WHERE "provider" = ${PROVIDER} AND "reference" = ${event.reference}
      FOR UPDATE
    `);
    const intent = intents[0];
    if (!intent) return { handled: false, reason: "UNKNOWN_REFERENCE" } as const;
    if (intent.status === "SUCCESS") return { handled: true, duplicate: true, paymentIntentId: intent.id } as const;

    const expectedKobo = Math.round(Number(intent.amount) * 100);
    if (event.amount !== expectedKobo || (event.currency && event.currency !== "NGN")) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "PaymentIntent" SET "status" = 'FAILED', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${intent.id}::uuid
      `);
      return { handled: false, reason: "AMOUNT_OR_CURRENCY_MISMATCH" } as const;
    }

    const invoices = await tx.$queryRaw<Array<{ studentId: string; amount: string; status: string; feeName: string }>>(Prisma.sql`
      SELECT "studentId", "amount"::text AS "amount", "status", "feeName"
      FROM "StudentFeeInvoice"
      WHERE "id" = ${intent.invoiceId}::uuid AND "schoolId" = ${intent.schoolId}::uuid
      FOR UPDATE
    `);
    const invoice = invoices[0];
    if (!invoice || invoice.status !== "OPEN") return { handled: false, reason: "INVOICE_NOT_PAYABLE" } as const;

    const paid = await tx.$queryRaw<Array<{ total: string }>>(Prisma.sql`
      SELECT COALESCE(SUM("amount"), 0)::text AS "total"
      FROM "PaymentRecord"
      WHERE "invoiceId" = ${intent.invoiceId}::uuid AND "schoolId" = ${intent.schoolId}::uuid
    `);
    const outstanding = Number(invoice.amount) - Number(paid[0]?.total ?? 0);
    if (Number(intent.amount) > outstanding) return { handled: false, reason: "OUTSTANDING_BALANCE_CHANGED" } as const;

    const paymentId = crypto.randomUUID();
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "PaymentRecord"
        ("id", "schoolId", "studentId", "invoiceId", "amount", "paidAt", "reference", "note", "recordedByUserId", "createdAt", "updatedAt")
      VALUES
        (${paymentId}::uuid, ${intent.schoolId}::uuid, ${invoice.studentId}::uuid, ${intent.invoiceId}::uuid,
         ${Number(intent.amount)}, CURRENT_TIMESTAMP, ${event.reference}, 'Paystack charge.success',
         NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    await tx.$executeRaw(Prisma.sql`
      UPDATE "PaymentIntent"
      SET "status" = 'SUCCESS', "providerTransactionId" = ${event.id ? String(event.id) : null}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${intent.id}::uuid
    `);

    return { handled: true, duplicate: false, paymentIntentId: intent.id, paymentId } as const;
  });
}
