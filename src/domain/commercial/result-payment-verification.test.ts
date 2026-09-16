import { describe, expect, it, vi } from "vitest";
import { verifyFlutterwaveResultPayment, verifyPaystackResultPayment } from "./result-payment-verification";
import type { PersistedResultPaymentAttempt } from "./result-payment-attempts";

const paystackAttempt: PersistedResultPaymentAttempt = {
  id: "attempt-1",
  schoolId: "school-1",
  studentId: "student-1",
  academicSessionId: "session-1",
  academicTermId: "term-1",
  amountNaira: 200,
  currency: "NGN",
  provider: "PAYSTACK",
  idempotencyKey: "result-1",
  status: "INITIALIZED",
  providerReference: "GBS-RESULT-1",
  checkoutUrl: "https://checkout.example/result-1",
};

const flutterwaveAttempt: PersistedResultPaymentAttempt = {
  ...paystackAttempt,
  provider: "FLUTTERWAVE",
  providerReference: "GBS-FLW-RESULT-1",
};

describe("result payment provider verification", () => {
  it("accepts a successful Paystack payment only when reference, amount and currency match", async () => {
    process.env.PAYSTACK_SECRET_KEY = "test-secret";
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: true,
      data: {
        status: "success",
        reference: "GBS-RESULT-1",
        amount: 20000,
        currency: "NGN",
        fees: 300,
      },
    }), { status: 200 }));

    const result = await verifyPaystackResultPayment(paystackAttempt, "GBS-RESULT-1", fetchImpl);
    expect(result.amountNaira).toBe(200);
    expect(result.providerFeeNaira).toBe(3);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("rejects a Paystack amount mismatch", async () => {
    process.env.PAYSTACK_SECRET_KEY = "test-secret";
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: true,
      data: { status: "success", reference: "GBS-RESULT-1", amount: 30000, currency: "NGN" },
    }), { status: 200 }));

    await expect(verifyPaystackResultPayment(paystackAttempt, "GBS-RESULT-1", fetchImpl))
      .rejects.toThrow("amount or currency does not match");
  });

  it("accepts a successful Flutterwave transaction and preserves the tx_ref", async () => {
    process.env.FLW_SECRET_KEY = "test-secret";
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "success",
      data: {
        status: "successful",
        tx_ref: "GBS-FLW-RESULT-1",
        amount: 200,
        currency: "NGN",
        app_fee: 3.5,
      },
    }), { status: 200 }));

    const result = await verifyFlutterwaveResultPayment(flutterwaveAttempt, "9911", fetchImpl);
    expect(result.providerReference).toBe("GBS-FLW-RESULT-1");
    expect(result.amountNaira).toBe(200);
    expect(result.providerFeeNaira).toBe(3.5);
  });

  it("rejects an unsuccessful Flutterwave transaction", async () => {
    process.env.FLW_SECRET_KEY = "test-secret";
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "success",
      data: { status: "failed", tx_ref: "GBS-FLW-RESULT-1", amount: 200, currency: "NGN" },
    }), { status: 200 }));

    await expect(verifyFlutterwaveResultPayment(flutterwaveAttempt, "9911", fetchImpl))
      .rejects.toThrow("could not be verified");
  });
});
