import { getEnabledSchoolPaymentProvider } from "@/domain/finance/payment-providers";
import type { PersistedResultPaymentAttempt } from "./result-payment-attempts";

export class ResultPaymentProviderError extends Error {}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new ResultPaymentProviderError(`${name} is not configured.`);
  return value;
}

function appBaseUrl() {
  return requireEnv("APP_BASE_URL").replace(/\/$/, "");
}

function providerReference(prefix: string) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

async function initializePaystackResultPayment(
  attempt: PersistedResultPaymentAttempt,
  payerEmail: string,
) {
  const configured = await getEnabledSchoolPaymentProvider(attempt.schoolId, "PAYSTACK");
  const provider = configured[0];
  if (!provider) throw new ResultPaymentProviderError("Paystack is not configured for this school.");

  const reference = providerReference("GBS-RESULT");
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("PAYSTACK_SECRET_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: payerEmail,
      amount: String(Math.round(attempt.amountNaira * 100)),
      currency: "NGN",
      reference,
      subaccount: provider.settlementAccountReference,
      callback_url: `${appBaseUrl()}/api/app/commercial/result-payments/paystack/callback`,
      metadata: {
        resultPaymentAttemptId: attempt.id,
        schoolId: attempt.schoolId,
        studentId: attempt.studentId,
        academicSessionId: attempt.academicSessionId,
        academicTermId: attempt.academicTermId,
      },
    }),
  });

  const data = await response.json() as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; reference?: string };
  };
  if (!response.ok || !data.status || !data.data?.authorization_url || !data.data.reference) {
    throw new ResultPaymentProviderError(data.message ?? "Paystack result payment initialization failed.");
  }

  return {
    provider: "PAYSTACK" as const,
    providerReference: data.data.reference,
    checkoutUrl: data.data.authorization_url,
  };
}

async function initializeFlutterwaveResultPayment(
  attempt: PersistedResultPaymentAttempt,
  payerEmail: string,
  payerName?: string,
) {
  const configured = await getEnabledSchoolPaymentProvider(attempt.schoolId, "FLUTTERWAVE");
  const provider = configured[0];
  if (!provider) throw new ResultPaymentProviderError("Flutterwave is not configured for this school.");

  const txRef = providerReference("GBS-FLW-RESULT");
  const response = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("FLW_SECRET_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: txRef,
      amount: attempt.amountNaira,
      currency: "NGN",
      redirect_url: `${appBaseUrl()}/api/app/commercial/result-payments/flutterwave/callback`,
      customer: { email: payerEmail, name: payerName || "App-School payer" },
      subaccounts: [{ id: provider.settlementAccountReference }],
      meta: {
        resultPaymentAttemptId: attempt.id,
        schoolId: attempt.schoolId,
        studentId: attempt.studentId,
        academicSessionId: attempt.academicSessionId,
        academicTermId: attempt.academicTermId,
      },
    }),
  });

  const data = await response.json() as {
    status?: string;
    message?: string;
    data?: { link?: string };
  };
  if (!response.ok || data.status !== "success" || !data.data?.link) {
    throw new ResultPaymentProviderError(data.message ?? "Flutterwave result payment initialization failed.");
  }

  return {
    provider: "FLUTTERWAVE" as const,
    providerReference: txRef,
    checkoutUrl: data.data.link,
  };
}

export async function initializeResultPaymentProviderCheckout(input: {
  attempt: PersistedResultPaymentAttempt;
  payerEmail: string;
  payerName?: string;
}) {
  if (input.attempt.provider === "PAYSTACK") {
    return initializePaystackResultPayment(input.attempt, input.payerEmail);
  }
  if (input.attempt.provider === "FLUTTERWAVE") {
    return initializeFlutterwaveResultPayment(input.attempt, input.payerEmail, input.payerName);
  }
  throw new ResultPaymentProviderError(
    "Monnify result payment initialization is not implemented yet; the existing provider configuration is preserved for a later adapter.",
  );
}
