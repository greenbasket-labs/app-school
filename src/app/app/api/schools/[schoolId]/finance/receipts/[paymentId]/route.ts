import { NextResponse } from "next/server";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { getPaymentReceipt, ReceiptNotFoundError } from "@/domain/finance/receipts";

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string; paymentId: string }> }) {
  try {
    const session = await currentSession();
    if (!session) throw new AuthorizationError("Authentication required.");
    const { schoolId, paymentId } = await params;
    const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.VIEW_FINANCE);
    await requireSchoolModule(membership.schoolId, "FINANCE");
    const receipt = await getPaymentReceipt(schoolId, paymentId);
    return NextResponse.json({ ok: true, receipt });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    }
    if (error instanceof ReceiptNotFoundError) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: error.message }, { status: 404 });
    }
    console.error("payment receipt failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
