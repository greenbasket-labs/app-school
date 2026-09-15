import { NextResponse } from "next/server";
import { handleMonnifySuccessfulTransaction, verifyMonnifySignature, MonnifyPaymentError } from "@/domain/finance/monnify";

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    if (!verifyMonnifySignature(rawBody, request.headers.get("monnify-signature"))) {
      return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 401 });
    }
    const payload = JSON.parse(rawBody) as {
      eventType?: string;
      eventData?: { paymentReference?: string; transactionReference?: string; paymentStatus?: string };
    };
    if (payload.eventType !== "SUCCESSFUL_TRANSACTION" || !payload.eventData?.paymentReference || !payload.eventData.transactionReference) {
      return NextResponse.json({ ok: true, ignored: true });
    }
    const result = await handleMonnifySuccessfulTransaction({
      paymentReference: payload.eventData.paymentReference,
      transactionReference: payload.eventData.transactionReference,
      paymentStatus: payload.eventData.paymentStatus ?? "PAID",
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (error instanceof MonnifyPaymentError) return NextResponse.json({ ok: false, error: "WEBHOOK_FAILED", message: error.message }, { status: 400 });
    console.error("monnify webhook failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
