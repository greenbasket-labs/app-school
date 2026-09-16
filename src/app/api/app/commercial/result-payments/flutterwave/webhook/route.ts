import { NextResponse } from "next/server";
import { verifyFlutterwaveSignature } from "@/domain/finance/flutterwave";
import { getResultPaymentAttemptByProviderReference } from "@/domain/commercial/result-payment-attempts";
import { processResultPaymentProviderEvent } from "@/domain/commercial/process-result-payment-event";
import { verifyFlutterwaveResultPayment } from "@/domain/commercial/result-payment-verification";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("verif-hash");

  try {
    if (!verifyFlutterwaveSignature(signature)) {
      return NextResponse.json({ error: "INVALID_PROVIDER_SIGNATURE" }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as {
      status?: string;
      data?: { id?: number | string; tx_ref?: string; status?: string };
    };
    const txRef = body.data?.tx_ref?.trim() ?? "";
    const transactionId = body.data?.id == null ? "" : String(body.data.id);

    if (!txRef || !transactionId || body.status !== "success" || body.data?.status !== "successful") {
      return NextResponse.json({ received: true });
    }

    const attempt = await getResultPaymentAttemptByProviderReference("FLUTTERWAVE", txRef);
    const result = await processResultPaymentProviderEvent({
      provider: "FLUTTERWAVE",
      eventKey: txRef,
      attempt,
      providerReference: txRef,
      verify: () => verifyFlutterwaveResultPayment(attempt, transactionId),
    });

    return NextResponse.json({
      received: true,
      verified: true,
      duplicate: result.duplicate,
      transactionId: result.transactionId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PAYMENT_WEBHOOK_FAILED" },
      { status: 400 },
    );
  }
}
