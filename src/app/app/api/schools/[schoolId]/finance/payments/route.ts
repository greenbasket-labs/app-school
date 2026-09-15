import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { getPaymentOptions, listPayments, PaymentValidationError, recordPayment } from "@/domain/finance/payments";

const bodySchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  reference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});

async function access(schoolId: string) {
  const session = await currentSession();
  if (!session) throw new AuthorizationError("Authentication required.");
  const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.MANAGE_FINANCE);
  await requireSchoolModule(membership.schoolId, "FINANCE");
  return session;
}

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    await access(schoolId);
    const [payments, options] = await Promise.all([listPayments(schoolId), getPaymentOptions(schoolId)]);
    return NextResponse.json({ ok: true, payments, options });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("payment list failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const session = await access(schoolId);
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
    const payment = await recordPayment(schoolId, parsed.data.invoiceId, parsed.data.amount, session.user.id, parsed.data.reference, parsed.data.note);
    return NextResponse.json({ ok: true, payment }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    if (error instanceof PaymentValidationError) return NextResponse.json({ ok: false, error: "INVALID_PAYMENT", message: error.message }, { status: 400 });
    console.error("payment create failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
