import { NextResponse } from "next/server";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";
import { requireSchoolModule } from "@/domain/modules/guard";
import { listFinanceAuditEvents } from "@/domain/finance/audit";

export async function GET(_: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  const schoolId = (await params).schoolId;
  const membership = await db.membership.findFirst({ where: { userId: session.user.id, schoolId, status: "ACTIVE" }, select: { capabilities: { select: { capability: { select: { code: true } } } } } });
  if (!membership || !membership.capabilities.some(({ capability }) => capability.code === CAPABILITIES.VIEW_FINANCE)) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  try {
    await requireSchoolModule(schoolId, "FINANCE");
    return NextResponse.json({ ok: true, events: await listFinanceAuditEvents(schoolId) });
  } catch (error) {
    console.error("finance audit failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
