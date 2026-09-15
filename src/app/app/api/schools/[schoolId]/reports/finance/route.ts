import { NextResponse } from "next/server";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { getFinanceSummary } from "@/domain/reports/finance-summary";

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const session = await currentSession();
    if (!session) throw new AuthorizationError("Authentication required.");
    await requireCapability(session.user.id, schoolId, CAPABILITIES.VIEW_FINANCE);
    await requireSchoolModule(schoolId, "REPORTS");
    await requireSchoolModule(schoolId, "FINANCE");
    return NextResponse.json({ ok: true, report: await getFinanceSummary(schoolId) });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("finance report failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
