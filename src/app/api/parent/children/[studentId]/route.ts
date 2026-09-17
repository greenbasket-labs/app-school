import { NextResponse } from "next/server";
import { currentSession } from "@/domain/auth/session-cookie";
import { getAcademicHistory } from "@/domain/assessments/academic-history";
import { GuardianAccountAuthorizationError, requireVerifiedGuardianChildAccess } from "@/domain/guardians/account-access";
import { db } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  const { studentId } = await params;
  const schoolId = new URL(request.url).searchParams.get("schoolId");
  if (!schoolId) return NextResponse.json({ ok: false, error: "SCHOOL_ID_REQUIRED" }, { status: 400 });

  try {
    await requireVerifiedGuardianChildAccess({ schoolId, userId: session.user.id, studentId });
    const student = await db.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true, admissionNumber: true, firstName: true, middleName: true, lastName: true },
    });
    if (!student) return NextResponse.json({ ok: false, error: "STUDENT_NOT_FOUND" }, { status: 404 });

    const history = await getAcademicHistory(schoolId, studentId);
    return NextResponse.json({ ok: true, schoolId, student, history: history.history });
  } catch (error) {
    if (error instanceof GuardianAccountAuthorizationError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    }
    console.error("parent child history lookup failed", error);
    return NextResponse.json({ ok: false, error: "PARENT_CHILD_LOOKUP_FAILED" }, { status: 500 });
  }
}
