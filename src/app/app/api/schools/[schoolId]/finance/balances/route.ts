import { NextResponse } from "next/server";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";
import { getFinanceReconciliation, listInvoiceBalances } from "@/domain/finance/balances";

export async function GET(_: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  const schoolId = (await params).schoolId;
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: { capabilities: { select: { capability: { select: { code: true } } } } },
  });
  if (!membership) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  if (!new Set(membership.capabilities.map(({ capability }) => capability.code)).has(CAPABILITIES.VIEW_FINANCE)) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  try {
    await requireSchoolModule(schoolId, "FINANCE");
    const [balances, summary] = await Promise.all([listInvoiceBalances(schoolId), getFinanceReconciliation(schoolId)]);
    return NextResponse.json({ ok: true, balances, summary });
  } catch (error) {
    console.error("finance balances failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
