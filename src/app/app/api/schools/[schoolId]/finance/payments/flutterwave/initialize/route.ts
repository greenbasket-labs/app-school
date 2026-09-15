import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";
import { FlutterwavePaymentError, initializeFlutterwavePayment } from "@/domain/finance/flutterwave";

const schema = z.object({ invoiceId: z.string().uuid(), payerEmail: z.string().email(), payerName: z.string().trim().max(160).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const session = await currentSession();
    if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    const schoolId = (await params).schoolId;
    const membership = await db.membership.findFirst({
      where: { userId: session.user.id, schoolId, status: "ACTIVE" },
      select: { capabilities: { select: { capability: { select: { code: true } } } } },
    });
    if (!membership) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    if (!new Set(membership.capabilities.map(({ capability }) => capability.code)).has(CAPABILITIES.MANAGE_FINANCE)) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    await requireSchoolModule(schoolId, "FINANCE");
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
    const payment = await initializeFlutterwavePayment(schoolId, parsed.data.invoiceId, parsed.data.payerEmail, parsed.data.payerName);
    return NextResponse.json({ ok: true, payment });
  } catch (error) {
    if (error instanceof FlutterwavePaymentError) return NextResponse.json({ ok: false, error: "PAYMENT_FAILED", message: error.message }, { status: 400 });
    console.error("flutterwave initialization failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
