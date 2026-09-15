import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { initializePaystackPayment, PaystackPaymentError } from "@/domain/finance/paystack";

const bodySchema = z.object({
  invoiceId: z.string().uuid(),
  payerEmail: z.string().email(),
});

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const session = await currentSession();
    if (!session) throw new AuthorizationError("Authentication required.");
    await requireCapability(session.user.id, schoolId, CAPABILITIES.MANAGE_FINANCE);
    await requireSchoolModule(schoolId, "FINANCE");

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });

    const payment = await initializePaystackPayment(schoolId, parsed.data.invoiceId, parsed.data.payerEmail);
    return NextResponse.json({ ok: true, payment }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    }
    if (error instanceof PaystackPaymentError) {
      return NextResponse.json({ ok: false, error: "PAYMENT_PROVIDER_ERROR", message: error.message }, { status: 400 });
    }
    console.error("paystack initialization failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
