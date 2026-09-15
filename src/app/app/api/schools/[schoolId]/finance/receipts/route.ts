import { NextResponse } from "next/server";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";
import { getPaymentReceipt, ReceiptNotFoundError } from "@/domain/finance/receipts";

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const paymentId = new URL(request.url).searchParams.get("paymentId");
    if (!paymentId) return NextResponse.json({ ok: false, error: "PAYMENT_ID_REQUIRED" }, { status: 400 });

    const session = await currentSession();
    if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    const membership = await db.membership.findFirst({
      where: { userId: session.user.id, schoolId, status: "ACTIVE" },
      select: { capabilities: { select: { capability: { select: { code: true } } } } },
    });
    if (!membership) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    if (!new Set(membership.capabilities.map(({ capability }) => capability.code)).has(CAPABILITIES.VIEW_FINANCE)) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }
    await requireSchoolModule(schoolId, "FINANCE");

    const receipt = await getPaymentReceipt(schoolId, paymentId);
    return NextResponse.json({ ok: true, receipt });
  } catch (error) {
    if (error instanceof ReceiptNotFoundError) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    console.error("receipt lookup failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
