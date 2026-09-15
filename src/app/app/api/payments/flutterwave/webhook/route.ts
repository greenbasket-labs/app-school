import { NextResponse } from "next/server";
import { FlutterwavePaymentError, handleFlutterwaveChargeCompleted, verifyFlutterwaveSignature } from "@/domain/finance/flutterwave";

export async function POST(request: Request) {
  try {
    if (!verifyFlutterwaveSignature(request.headers.get("verif-hash"))) {
      return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 401 });
    }

    const event = await request.json() as {
      event?: string;
      data?: { id?: number; tx_ref?: string; status?: string };
    };

    if (event.event !== "charge.completed") return NextResponse.json({ ok: true, ignored: true });
    if (typeof event.data?.id !== "number" || !event.data.tx_ref || !event.data.status) {
      return NextResponse.json({ ok: false, error: "INVALID_EVENT" }, { status: 400 });
    }

    const result = await handleFlutterwaveChargeCompleted({
      id: event.data.id,
      tx_ref: event.data.tx_ref,
      status: event.data.status,
    });

    if (!result.handled && result.reason === "UNKNOWN_REFERENCE") return NextResponse.json({ ok: false, error: "UNKNOWN_REFERENCE" }, { status: 404 });
    if (!result.handled) return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (error instanceof FlutterwavePaymentError) return NextResponse.json({ ok: false, error: "PROVIDER_CONFIGURATION_ERROR" }, { status: 500 });
    console.error("flutterwave webhook failed", error);
    return NextResponse.json({ ok: false, error: "WEBHOOK_FAILED" }, { status: 500 });
  }
}
