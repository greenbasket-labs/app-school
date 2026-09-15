import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnabledSchoolPaymentProvider } from "@/domain/finance/payment-providers";

const PROVIDER = "MONNIFY" as const;

export class MonnifyPaymentError extends Error {}

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new MonnifyPaymentError(`${name} is not configured.`);
  return value;
}

function apiBase() {
  return (process.env.MONNIFY_BASE_URL || "https://api.monnify.com").replace(/\/$/, "");
}

async function accessToken() {
  const credentials = Buffer.from(`${env("MONNIFY_API_KEY")}:${env("MONNIFY_SECRET_KEY")}`).toString("base64");
  const response = await fetch(`${apiBase()}/api/v1/auth/login`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}` },
  });
  const data = await response.json() as { requestSuccessful?: boolean; responseBody?: { accessToken?: string }; responseMessage?: string };
  if (!response.ok || !data.requestSuccessful || !data.responseBody?.accessToken) {
    throw new MonnifyPaymentError(data.responseMessage ?? "Monnify authentication failed.");
  }
  return data.responseBody.accessToken;
}

function reference() {
  return `GBS-MNFY-${Date.now()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export function verifyMonnifySignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const expected = createHmac("sha512", env("MONNIFY_SECRET_KEY")).update(rawBody).digest("hex");
  const supplied = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return supplied.length === expectedBuffer.length && timingSafeEqual(supplied, expectedBuffer);
}

export async function initializeMonnifyPayment(schoolId: string, invoiceId: string, payerEmail: string, payerName?: string) {
  const provider = await getEnabledSchoolPaymentProvider(schoolId, PROVIDER);
  const settlement = provider[0];
  if (!settlement) throw new MonnifyPaymentError("Monnify is not configured for this school.");

  const invoice = await db.$queryRaw<Array<{ studentId: string; amount: string; status: string; feeName: string }>>(Prisma.sql`
    SELECT "studentId", "amount"::text AS "amount", "status", "feeName"
    FROM "StudentFeeInvoice"
    WHERE "id" = ${invoiceId}::uuid AND "schoolId" = ${schoolId}::uuid LIMIT 1
  `);
  const row = invoice[0];
  if (!row) throw new MonnifyPaymentError("Invoice was not found in this school.");
  if (row.status !== "OPEN") throw new MonnifyPaymentError("This invoice cannot accept an online payment.");

  const paid = await db.$queryRaw<Array<{ total: string }>>(Prisma.sql`
    SELECT COALESCE(SUM("amount"), 0)::text AS "total" FROM "PaymentRecord"
    WHERE "invoiceId" = ${invoiceId}::uuid AND "schoolId" = ${schoolId}::uuid
  `);
  const outstanding = Number(row.amount) - Number(paid[0]?.total ?? 0);
  if (outstanding <= 0) throw new MonnifyPaymentError("This invoice is already fully paid.");

  const intentId = crypto.randomUUID();
  const paymentReference = reference();
  await db.$executeRaw(Prisma.sql`
    INSERT INTO "PaymentIntent"
      ("id", "schoolId", "invoiceId", "provider", "reference", "amount", "currency", "status", "settlementAccountReference", "createdAt", "updatedAt")
    VALUES
      (${intentId}::uuid, ${schoolId}::uuid, ${invoiceId}::uuid, ${PROVIDER}, ${paymentReference}, ${outstanding}, 'NGN', 'INITIALIZED', ${settlement.settlementAccountReference}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  try {
    const token = await accessToken();
    const response = await fetch(`${apiBase()}/api/v1/merchant/transactions/init-transaction`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: outstanding,
        customerEmail: payerEmail,
        customerName: payerName || "App-School payer",
        paymentReference,
        paymentDescription: row.feeName,
        currencyCode: "NGN",
        contractCode: env("MONNIFY_CONTRACT_CODE"),
        redirectUrl: `${env("APP_BASE_URL").replace(/\/$/, "")}/api/schools/${schoolId}/finance/payments/monnify/callback`,
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD", "PHONE_NUMBER", "PAY_WITH_BANK"],
        metadata: { paymentIntentId: intentId, schoolId, invoiceId, studentId: row.studentId },
        incomeSplitConfig: [{ subAccountCode: settlement.settlementAccountReference, feePercentage: 0, splitAmount: outstanding, feeBearer: true }],
      }),
    });
    const data = await response.json() as { requestSuccessful?: boolean; responseMessage?: string; responseBody?: { transactionReference?: string; checkoutUrl?: string } };
    if (!response.ok || !data.requestSuccessful || !data.responseBody?.checkoutUrl || !data.responseBody.transactionReference) {
      throw new MonnifyPaymentError(data.responseMessage ?? "Monnify payment initialization failed.");
    }

    await db.$executeRaw(Prisma.sql`
      UPDATE "PaymentIntent" SET "checkoutUrl" = ${data.responseBody.checkoutUrl}, "providerTransactionId" = ${data.responseBody.transactionReference}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${intentId}::uuid
    `);
    return { paymentIntentId: intentId, provider: PROVIDER, reference: paymentReference, amount: outstanding, currency: "NGN", checkoutUrl: data.responseBody.checkoutUrl };
  } catch (error) {
    await db.$executeRaw(Prisma.sql`UPDATE "PaymentIntent" SET "status" = 'FAILED', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${intentId}::uuid`);
    throw error;
  }
}

export async function handleMonnifySuccessfulTransaction(event: { paymentReference: string; transactionReference: string; paymentStatus: string }) {
  if (event.paymentStatus !== "PAID") return { handled: true, ignored: true } as const;
  const token = await accessToken();
  const response = await fetch(`${apiBase()}/api/v2/merchant/transactions/query?paymentReference=${encodeURIComponent(event.paymentReference)}`, { headers: { Authorization: `Bearer ${token}` } });
  const verified = await response.json() as { requestSuccessful?: boolean; responseBody?: { paymentReference?: string; transactionReference?: string; paymentStatus?: string; amountPaid?: string; currency?: string } };
  if (!response.ok || !verified.requestSuccessful || !verified.responseBody) throw new MonnifyPaymentError("Monnify transaction verification failed.");
  const tx = verified.responseBody;
  if (tx.paymentStatus !== "PAID" || tx.paymentReference !== event.paymentReference || tx.transactionReference !== event.transactionReference || tx.currency !== "NGN") return { handled: false, reason: "PROVIDER_VERIFICATION_MISMATCH" } as const;

  return db.$transaction(async (dbTx) => {
    const intents = await dbTx.$queryRaw<Array<{ id: string; schoolId: string; invoiceId: string; amount: string; status: string }>>(Prisma.sql`
      SELECT "id", "schoolId", "invoiceId", "amount"::text AS "amount", "status" FROM "PaymentIntent"
      WHERE "provider" = ${PROVIDER} AND "reference" = ${event.paymentReference} FOR UPDATE
    `);
    const intent = intents[0];
    if (!intent) return { handled: false, reason: "UNKNOWN_REFERENCE" } as const;
    if (intent.status === "SUCCESS") return { handled: true, duplicate: true, paymentIntentId: intent.id } as const;
    if (Number(tx.amountPaid) !== Number(intent.amount)) return { handled: false, reason: "AMOUNT_MISMATCH" } as const;

    const invoices = await dbTx.$queryRaw<Array<{ studentId: string; amount: string; status: string }>>(Prisma.sql`
      SELECT "studentId", "amount"::text AS "amount", "status" FROM "StudentFeeInvoice"
      WHERE "id" = ${intent.invoiceId}::uuid AND "schoolId" = ${intent.schoolId}::uuid FOR UPDATE
    `);
    const invoice = invoices[0];
    if (!invoice || invoice.status !== "OPEN") return { handled: false, reason: "INVOICE_NOT_PAYABLE" } as const;
    const paid = await dbTx.$queryRaw<Array<{ total: string }>>(Prisma.sql`
      SELECT COALESCE(SUM("amount"), 0)::text AS "total" FROM "PaymentRecord"
      WHERE "invoiceId" = ${intent.invoiceId}::uuid AND "schoolId" = ${intent.schoolId}::uuid
    `);
    const outstanding = Number(invoice.amount) - Number(paid[0]?.total ?? 0);
    if (Number(intent.amount) > outstanding) return { handled: false, reason: "OUTSTANDING_BALANCE_CHANGED" } as const;

    const paymentId = crypto.randomUUID();
    await dbTx.$executeRaw(Prisma.sql`
      INSERT INTO "PaymentRecord"
        ("id", "schoolId", "studentId", "invoiceId", "amount", "paidAt", "reference", "note", "recordedByUserId", "createdAt", "updatedAt")
      VALUES (${paymentId}::uuid, ${intent.schoolId}::uuid, ${invoice.studentId}::uuid, ${intent.invoiceId}::uuid, ${Number(intent.amount)}, CURRENT_TIMESTAMP, ${event.paymentReference}, 'Monnify successful transaction', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    await dbTx.$executeRaw(Prisma.sql`UPDATE "PaymentIntent" SET "status" = 'SUCCESS', "providerTransactionId" = ${event.transactionReference}, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ${intent.id}::uuid`);
    return { handled: true, duplicate: false, paymentIntentId: intent.id, paymentId } as const;
  });
}
