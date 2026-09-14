import { NextResponse } from "next/server";
import {
  AuthenticationRequiredError,
  SchoolContextRequiredError,
  requireSchoolContext,
} from "@/domain/auth/context";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await params;

  try {
    const { membership } = await requireSchoolContext(schoolId);
    return NextResponse.json({
      ok: true,
      school: membership.school,
      membership: {
        id: membership.id,
        organizationId: membership.organizationId,
        schoolId: membership.schoolId,
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }
    if (error instanceof SchoolContextRequiredError) {
      return NextResponse.json({ ok: false, error: "SCHOOL_ACCESS_DENIED" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
