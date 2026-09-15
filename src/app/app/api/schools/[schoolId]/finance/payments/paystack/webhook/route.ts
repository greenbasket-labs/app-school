import { NextResponse } from "next/server";
import { handlePaystackChargeSuccess, verifyPaystackSignature, PaystackPaymentError } from "@/domain/finance/paystack";

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");
    if (!verifyPaystackSignature(rawBody, signature)) {
      return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as {
      event?: string;
      data?: { reference?: string; amount?: number; currency?: string; id?: number; metadata?: { schoolId?: string } };
    };

    if (event.data?.metadata?.schoolId && event.data.metadata.schoolId !== schoolId) {
      return NextResponse.json({ ok: false, error: "SCHOOL_MISMATCH" }, { status: 400 });
    }

    if (event.event !== "charge.success") return NextResponse.json({ ok: true, ignored: true });
    if (!event.data?.reference || typeof event.data.amount !== "number") {
      return NextResponse.json({ ok: false, error: "INVALID_EVENT" }, { status: 400 });
    }

    const result = await handlePaystackChargeSuccess({
      reference: event.data.reference,
      amount: event.data.amount,
      currency: event.data.currency,
      id: event.data.id,
    });

    if (!result.handled && result.reason === "UNKNOWN_REFERENCE") {
      return NextResponse.json({ ok: false, error: "UNKNOWN_REFERENCE" }, { status: 404 });
    }
    if (!result.handled) {
      return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (error instanceof PaystackPaymentError) return NextResponse.json({ ok: false, error: "PROVIDER_CONFIGURATION_ERROR" }, { status: 500 });
    console.error("paystack webhook failed", error);
    return NextResponse.json({ ok: false, error: "WEBHOOK_FAILED" }, { status: 500 });
  }
}
