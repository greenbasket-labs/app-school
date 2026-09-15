import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { getAttendanceSummary } from "@/domain/reports/attendance-summary";

const querySchema = z.object({ from: z.string().date(), to: z.string().date(), classArmId: z.string().uuid().optional() }).refine((value) => value.from <= value.to, { message: "From date must be on or before to date." });

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const session = await currentSession();
    if (!session) throw new AuthorizationError("Authentication required.");
    const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.VIEW_ATTENDANCE);
    await requireSchoolModule(membership.schoolId, "REPORTS");
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST", message: parsed.error.issues[0]?.message }, { status: 400 });
    const report = await getAttendanceSummary(schoolId, parsed.data.from, parsed.data.to, parsed.data.classArmId);
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("attendance report failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
