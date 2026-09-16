import { NextResponse } from "next/server";
import { verifyPaystackSignature } from "@/domain/finance/paystack";
import { getResultPaymentAttemptByProviderReference } from "@/domain/commercial/result-payment-attempts";
import { processResultPaymentProviderEvent } from "@/domain/commercial/process-result-payment-event";
import { verifyPaystackResultPayment } from "@/domain/commercial/result-payment-verification";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  try {
    if (!verifyPaystackSignature(rawBody, signature)) {
      return NextResponse.json({ error: "INVALID_PROVIDER_SIGNATURE" }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as {
      event?: string;
      data?: { reference?: string };
    };
    const reference = body.data?.reference?.trim() ?? "";

    if (body.event !== "charge.success" || !reference) {
      return NextResponse.json({ received: true });
    }

    const attempt = await getResultPaymentAttemptByProviderReference("PAYSTACK", reference);
    const result = await processResultPaymentProviderEvent({
      provider: "PAYSTACK",
      eventKey: reference,
      attempt,
      providerReference: reference,
      verify: () => verifyPaystackResultPayment(attempt, reference),
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
