import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { getAcademicSummary, AcademicSummaryValidationError } from "@/domain/reports/academic-summary";

const querySchema = z.object({ sessionId: z.string().uuid(), termId: z.string().uuid(), classArmId: z.string().uuid().optional() });

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const session = await currentSession();
    if (!session) throw new AuthorizationError("Authentication required.");
    const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.VIEW_STUDENTS);
    await requireSchoolModule(membership.schoolId, "REPORTS");
    await requireSchoolModule(membership.schoolId, "ASSESSMENTS");
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST", message: parsed.error.issues[0]?.message }, { status: 400 });
    const report = await getAcademicSummary(schoolId, parsed.data.sessionId, parsed.data.termId, parsed.data.classArmId);
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError || error instanceof AcademicSummaryValidationError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("academic report failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
