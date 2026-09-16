import { NextResponse } from "next/server";
import { getResultPaymentAttemptByProviderReference } from "@/domain/commercial/result-payment-attempts";
import { processResultPaymentProviderEvent } from "@/domain/commercial/process-result-payment-event";
import { verifyPaystackResultPayment } from "@/domain/commercial/result-payment-verification";

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference")?.trim() ?? "";

  if (!reference) {
    return NextResponse.json({ error: "PAYMENT_CALLBACK_DATA_REQUIRED" }, { status: 400 });
  }

  try {
    const attempt = await getResultPaymentAttemptByProviderReference("PAYSTACK", reference);
    const result = await processResultPaymentProviderEvent({
      provider: "PAYSTACK",
      eventKey: reference,
      attempt,
      providerReference: reference,
      verify: () => verifyPaystackResultPayment(attempt, reference),
    });

    return NextResponse.json({
      status: "verified",
      duplicate: result.duplicate,
      transactionId: result.transactionId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PAYMENT_CALLBACK_FAILED" },
      { status: 400 },
    );
  }
}
