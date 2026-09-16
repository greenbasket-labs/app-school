import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeRaw, queryRaw } = vi.hoisted(() => ({
  executeRaw: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { $executeRaw: executeRaw, $queryRaw: queryRaw },
}));

import {
  recordResultPaymentProviderEvent,
  ResultPaymentProviderEventConflictError,
} from "./result-payment-provider-events";

describe("result payment provider event idempotency", () => {
  beforeEach(() => {
    executeRaw.mockReset();
    queryRaw.mockReset();
    executeRaw.mockResolvedValue(1);
  });

  it("reserves a provider event and returns the existing event on replay", async () => {
    queryRaw.mockResolvedValueOnce([{
      id: "event-1",
      provider: "PAYSTACK",
      eventKey: "GBS-RESULT-1",
      paymentAttemptId: "attempt-1",
      providerReference: "GBS-RESULT-1",
      status: "RECEIVED",
    }]);

    const result = await recordResultPaymentProviderEvent({
      provider: "PAYSTACK",
      eventKey: "GBS-RESULT-1",
      paymentAttemptId: "attempt-1",
      providerReference: "GBS-RESULT-1",
    });

    expect(result.status).toBe("RECEIVED");
    expect(executeRaw).toHaveBeenCalledOnce();

    queryRaw.mockResolvedValueOnce([result]);
    const replay = await recordResultPaymentProviderEvent({
      provider: "PAYSTACK",
      eventKey: "GBS-RESULT-1",
      paymentAttemptId: "attempt-1",
      providerReference: "GBS-RESULT-1",
    });

    expect(replay.id).toBe("event-1");
    expect(replay.status).toBe("RECEIVED");
  });

  it("rejects reusing an event key for a different payment attempt", async () => {
    queryRaw.mockResolvedValueOnce([{
      id: "event-1",
      provider: "PAYSTACK",
      eventKey: "GBS-RESULT-1",
      paymentAttemptId: "attempt-1",
      providerReference: "GBS-RESULT-1",
      status: "RECEIVED",
    }]);

    await expect(recordResultPaymentProviderEvent({
      provider: "PAYSTACK",
      eventKey: "GBS-RESULT-1",
      paymentAttemptId: "attempt-2",
      providerReference: "GBS-RESULT-1",
    })).rejects.toBeInstanceOf(ResultPaymentProviderEventConflictError);
  });

  it("requires a non-empty event key", async () => {
    await expect(recordResultPaymentProviderEvent({
      provider: "FLUTTERWAVE",
      eventKey: "   ",
    })).rejects.toThrow("eventKey is required");
    expect(executeRaw).not.toHaveBeenCalled();
  });
});
