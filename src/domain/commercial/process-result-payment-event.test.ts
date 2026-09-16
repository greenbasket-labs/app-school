import { beforeEach, describe, expect, it, vi } from "vitest";

const recordEvent = vi.fn();
const transitionEvent = vi.fn();
const recordTransaction = vi.fn();

vi.mock("./result-payment-provider-events", () => ({
  recordResultPaymentProviderEvent: recordEvent,
  transitionResultPaymentProviderEvent: transitionEvent,
}));

vi.mock("./result-access-transactions", () => ({
  recordVerifiedResultPayment: recordTransaction,
}));

import { processResultPaymentProviderEvent } from "./process-result-payment-event";

const attempt = {
  id: "attempt-1",
  schoolId: "school-1",
  studentId: "student-1",
  academicSessionId: "session-1",
  academicTermId: "term-1",
  amountNaira: 200,
  currency: "NGN" as const,
  provider: "PAYSTACK" as const,
  idempotencyKey: "key-1",
  status: "INITIALIZED" as const,
  providerReference: "GBS-RESULT-1",
  checkoutUrl: "https://checkout.example/result-1",
};

const verified = {
  provider: "PAYSTACK" as const,
  providerReference: "GBS-RESULT-1",
  amountNaira: 200,
  currency: "NGN" as const,
  providerFeeNaira: 3,
  verifiedAt: new Date("2026-09-16T15:00:00.000Z"),
};

describe("processResultPaymentProviderEvent", () => {
  beforeEach(() => {
    recordEvent.mockReset();
    transitionEvent.mockReset();
    recordTransaction.mockReset();
  });

  it("verifies then records the transaction and marks the event processed", async () => {
    recordEvent.mockResolvedValue({
      id: "event-1",
      provider: "PAYSTACK",
      eventKey: "GBS-RESULT-1",
      paymentAttemptId: "attempt-1",
      providerReference: "GBS-RESULT-1",
      status: "RECEIVED",
    });
    recordTransaction.mockResolvedValue({ duplicate: false, transactionId: "transaction-1" });
    const verify = vi.fn().mockResolvedValue(verified);

    const result = await processResultPaymentProviderEvent({
      provider: "PAYSTACK",
      eventKey: "GBS-RESULT-1",
      attempt,
      providerReference: "GBS-RESULT-1",
      verify,
    });

    expect(verify).toHaveBeenCalledOnce();
    expect(recordTransaction).toHaveBeenCalledWith({ paymentAttemptId: "attempt-1", ...verified });
    expect(transitionEvent).toHaveBeenCalledWith("event-1", "PROCESSED");
    expect(result).toEqual({ duplicate: false, transactionId: "transaction-1" });
  });

  it("does not verify or write a transaction for a processed replay", async () => {
    recordEvent.mockResolvedValue({
      id: "event-1",
      provider: "PAYSTACK",
      eventKey: "GBS-RESULT-1",
      paymentAttemptId: "attempt-1",
      providerReference: "GBS-RESULT-1",
      status: "PROCESSED",
    });
    const verify = vi.fn();

    const result = await processResultPaymentProviderEvent({
      provider: "PAYSTACK",
      eventKey: "GBS-RESULT-1",
      attempt,
      providerReference: "GBS-RESULT-1",
      verify,
    });

    expect(verify).not.toHaveBeenCalled();
    expect(recordTransaction).not.toHaveBeenCalled();
    expect(result).toEqual({ duplicate: true, transactionId: null });
  });
});
