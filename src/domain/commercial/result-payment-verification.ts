import type { PaymentProvider } from "@/domain/finance/payment-providers";
import type { PersistedResultPaymentAttempt } from "./result-payment-attempts";

export class ResultPaymentVerificationError extends Error {}

type FetchLike = typeof fetch;

export type VerifiedProviderPayment = {
  provider: PaymentProvider;
  providerReference: string;
  amountNaira: number;
  currency: "NGN";
  providerFeeNaira: number | null;
  verifiedAt: Date;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new ResultPaymentVerificationError(`${name} is not configured.`);
  return value;
}

function requirePositiveAmount(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ResultPaymentVerificationError("Provider returned an invalid payment amount.");
  }
  return amount;
}

function assertNgnCurrency(value: unknown) {
  if (value !== "NGN") {
    throw new ResultPaymentVerificationError("Provider payment currency is not NGN.");
  }
}

function assertAttemptMatch(
  attempt: PersistedResultPaymentAttempt,
  providerReference: string,
  amountNaira: number,
  currency: "NGN",
) {
  if (attempt.provider !== "PAYSTACK" && attempt.provider !== "FLUTTERWAVE") {
    throw new ResultPaymentVerificationError("This provider is not supported by the result-payment verification boundary.");
  }
  if (attempt.providerReference && attempt.providerReference !== providerReference) {
    throw new ResultPaymentVerificationError("Provider reference does not match the payment attempt.");
  }
  if (attempt.amountNaira !== amountNaira || attempt.currency !== currency) {
    throw new ResultPaymentVerificationError("Verified provider amount or currency does not match the payment attempt.");
  }
}

export async function verifyPaystackResultPayment(
  attempt: PersistedResultPaymentAttempt,
  reference: string,
  fetchImpl: FetchLike = fetch,
): Promise<VerifiedProviderPayment> {
  if (attempt.provider !== "PAYSTACK") {
    throw new ResultPaymentVerificationError("Payment attempt provider is not Paystack.");
  }
  if (!reference.trim()) throw new ResultPaymentVerificationError("Paystack reference is required.");

  const response = await fetchImpl(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${requireEnv("PAYSTACK_SECRET_KEY")}` },
  });
  const body = await response.json() as {
    status?: boolean;
    message?: string;
    data?: {
      status?: string;
      reference?: string;
      amount?: number;
      currency?: string;
      fees?: number | null;
    };
  };

  if (!response.ok || !body.status || body.data?.status !== "success") {
    throw new ResultPaymentVerificationError(body.message ?? "Paystack payment could not be verified.");
  }

  const providerReference = body.data.reference ?? reference;
  const amountNaira = requirePositiveAmount(body.data.amount) / 100;
  if (body.data.currency !== "NGN") assertNgnCurrency(body.data.currency);
  assertAttemptMatch(attempt, providerReference, amountNaira, "NGN");

  return {
    provider: "PAYSTACK",
    providerReference,
    amountNaira,
    currency: "NGN",
    providerFeeNaira: body.data.fees == null ? null : Number(body.data.fees) / 100,
    verifiedAt: new Date(),
  };
}

export async function verifyFlutterwaveResultPayment(
  attempt: PersistedResultPaymentAttempt,
  transactionId: string,
  fetchImpl: FetchLike = fetch,
): Promise<VerifiedProviderPayment> {
  if (attempt.provider !== "FLUTTERWAVE") {
    throw new ResultPaymentVerificationError("Payment attempt provider is not Flutterwave.");
  }
  if (!transactionId.trim()) throw new ResultPaymentVerificationError("Flutterwave transaction ID is required.");

  const response = await fetchImpl(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
    headers: { Authorization: `Bearer ${requireEnv("FLW_SECRET_KEY")}` },
  });
  const body = await response.json() as {
    status?: string;
    message?: string;
    data?: {
      status?: string;
      tx_ref?: string;
      amount?: number;
      currency?: string;
      app_fee?: number | null;
      charged_amount?: number | null;
    };
  };

  if (!response.ok || body.status !== "success" || body.data?.status !== "successful") {
    throw new ResultPaymentVerificationError(body.message ?? "Flutterwave payment could not be verified.");
  }

  const providerReference = body.data.tx_ref;
  if (!providerReference) throw new ResultPaymentVerificationError("Flutterwave verification did not return a transaction reference.");
  const amountNaira = requirePositiveAmount(body.data.amount);
  assertNgnCurrency(body.data.currency);
  assertAttemptMatch(attempt, providerReference, amountNaira, "NGN");

  const providerFeeNaira = body.data.app_fee == null
    ? null
    : Number(body.data.app_fee);

  return {
    provider: "FLUTTERWAVE",
    providerReference,
    amountNaira,
    currency: "NGN",
    providerFeeNaira,
    verifiedAt: new Date(),
  };
}
