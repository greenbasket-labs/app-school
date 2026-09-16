import { NextResponse } from "next/server";
import { getResultPaymentAttemptByProviderReference } from "@/domain/commercial/result-payment-attempts";
import { processResultPaymentProviderEvent } from "@/domain/commercial/process-result-payment-event";
import { verifyFlutterwaveResultPayment } from "@/domain/commercial/result-payment-verification";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const transactionId = url.searchParams.get("transaction_id")?.trim() ?? "";
  const txRef = url.searchParams.get("tx_ref")?.trim() ?? "";

  if (!transactionId || !txRef) {
    return NextResponse.json({ error: "PAYMENT_CALLBACK_DATA_REQUIRED" }, { status: 400 });
  }

  try {
    const attempt = await getResultPaymentAttemptByProviderReference("FLUTTERWAVE", txRef);
    const result = await processResultPaymentProviderEvent({
      provider: "FLUTTERWAVE",
      eventKey: transactionId,
      attempt,
      providerReference: txRef,
      verify: () => verifyFlutterwaveResultPayment(attempt, transactionId),
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
