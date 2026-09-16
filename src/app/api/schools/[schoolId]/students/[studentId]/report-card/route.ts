import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import {
  getPublishedReportCard,
  ReportCardValidationError,
} from "@/domain/assessments/report-card";

const querySchema = z.object({
  academicSessionId: z.string().uuid(),
  academicTermId: z.string().uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ schoolId: string; studentId: string }> },
) {
  try {
    const { schoolId, studentId } = await params;
    const session = await currentSession();
    if (!session) throw new AuthorizationError("Authentication required.");

    const membership = await requireCapability(
      session.user.id,
      schoolId,
      CAPABILITIES.VIEW_STUDENTS,
    );
    await requireSchoolModule(membership.schoolId, "ASSESSMENTS");

    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const reportCard = await getPublishedReportCard(
      membership.schoolId,
      studentId,
      query.academicSessionId,
      query.academicTermId,
    );

    return NextResponse.json({ ok: true, reportCard }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "INVALID_REPORT_CARD_QUERY", issues: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN", message: error.message },
        { status: 403 },
      );
    }
    if (error instanceof ReportCardValidationError) {
      return NextResponse.json(
        { ok: false, error: "REPORT_CARD_UNAVAILABLE", message: error.message },
        { status: 400 },
      );
    }

    console.error("report card request failed", error);
    return NextResponse.json(
      { ok: false, error: "REQUEST_FAILED" },
      { status: 500 },
    );
  }
}
