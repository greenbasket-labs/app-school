import { recordVerifiedResultPayment } from "./result-access-transactions";
import {
  recordResultPaymentProviderEvent,
  transitionResultPaymentProviderEvent,
} from "./result-payment-provider-events";
import type { PersistedResultPaymentAttempt } from "./result-payment-attempts";
import type { ResultPaymentProvider } from "./result-access-policy";
import type { VerifiedProviderPayment } from "./result-payment-verification";

export async function processResultPaymentProviderEvent(input: {
  provider: ResultPaymentProvider;
  eventKey: string;
  attempt: PersistedResultPaymentAttempt;
  providerReference: string;
  verify: () => Promise<VerifiedProviderPayment>;
}) {
  const event = await recordResultPaymentProviderEvent({
    provider: input.provider,
    eventKey: input.eventKey,
    paymentAttemptId: input.attempt.id,
    providerReference: input.providerReference,
  });

  if (event.status === "PROCESSED") {
    return { duplicate: true, transactionId: null } as const;
  }

  try {
    const verified = await input.verify();
    const result = await recordVerifiedResultPayment({
      paymentAttemptId: input.attempt.id,
      ...verified,
    });
    await transitionResultPaymentProviderEvent(event.id, "PROCESSED");
    return { duplicate: result.duplicate, transactionId: result.transactionId } as const;
  } catch (error) {
    await transitionResultPaymentProviderEvent(
      event.id,
      "FAILED",
      error instanceof Error ? error.message : "RESULT_PAYMENT_EVENT_FAILED",
    );
    throw error;
  }
}
