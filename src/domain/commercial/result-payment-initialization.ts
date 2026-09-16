import { initializeResultPaymentProviderCheckout } from "./result-payment-providers";
import {
  createOrGetResultPaymentAttempt,
  transitionResultPaymentAttempt,
  type PersistedResultPaymentAttempt,
} from "./result-payment-attempts";
import {
  evaluateResultAccess,
  type ResultAccessAuthorizationInput,
  type ResultPaymentAttemptInput,
} from "./result-access-policy";
import { normalizeResultAccessSettings } from "./plans";

export class ResultPaymentInitializationError extends Error {}

export async function initializeResultPayment(input: {
  authorization: ResultAccessAuthorizationInput;
  attempt: ResultPaymentAttemptInput;
  payerEmail: string;
  payerName?: string;
}): Promise<PersistedResultPaymentAttempt> {
  const decision = evaluateResultAccess(input.authorization);
  if (decision.allowed) {
    throw new ResultPaymentInitializationError("Payment is not required for this result.");
  }
  if (decision.reason !== "PAYMENT_REQUIRED") {
    throw new ResultPaymentInitializationError(`Result payment is not allowed: ${decision.reason}.`);
  }

  const settings = normalizeResultAccessSettings(input.authorization.settings);
  if (!settings.enabled || settings.amountNaira <= 0) {
    throw new ResultPaymentInitializationError("This result does not require a paid access attempt.");
  }
  if (input.attempt.amountNaira !== settings.amountNaira) {
    throw new ResultPaymentInitializationError("Payment amount does not match the current Result Access fee.");
  }

  const attempt = await createOrGetResultPaymentAttempt(input.attempt);

  if (attempt.status === "INITIALIZED" && attempt.checkoutUrl && attempt.providerReference) {
    return attempt;
  }
  if (attempt.status === "SUCCEEDED") {
    throw new ResultPaymentInitializationError("This payment attempt has already succeeded.");
  }

  try {
    const checkout = await initializeResultPaymentProviderCheckout({
      attempt,
      payerEmail: input.payerEmail,
      payerName: input.payerName,
    });

    await transitionResultPaymentAttempt(
      attempt.id,
      "INITIALIZED",
      checkout.providerReference,
      checkout.checkoutUrl,
    );

    return {
      ...attempt,
      status: "INITIALIZED",
      providerReference: checkout.providerReference,
      checkoutUrl: checkout.checkoutUrl,
    };
  } catch (error) {
    await transitionResultPaymentAttempt(attempt.id, "FAILED");
    throw error;
  }
}
