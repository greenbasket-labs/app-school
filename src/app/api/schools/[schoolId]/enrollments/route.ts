import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { enrollStudent, StudentConflictError } from "@/domain/students/service";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";

const schema = z.object({ studentId: z.string().uuid(), academicSessionId: z.string().uuid(), classArmId: z.string().uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const session = await currentSession();
    if (!session) throw new AuthorizationError("Authentication required.");
    const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.MANAGE_STUDENTS);
    await requireSchoolModule(membership.schoolId, "STUDENTS");
    const enrollment = await enrollStudent(schema.parse(await request.json()));
    if (enrollment.student.schoolId !== membership.schoolId) throw new AuthorizationError("Enrollment does not belong to this school.");
    await db.auditEvent.create({ data: { schoolId: membership.schoolId, actorUserId: membership.userId, action: "student.enrolled", entityType: "Enrollment", entityId: enrollment.id, currentState: { studentId: enrollment.studentId, academicSessionId: enrollment.academicSessionId, classArmId: enrollment.classArmId } } });
    return NextResponse.json({ ok: true, enrollment }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "INVALID_ENROLLMENT_DATA", issues: error.issues }, { status: 400 });
    if (error instanceof StudentConflictError) return NextResponse.json({ ok: false, error: "ENROLLMENT_EXISTS", message: error.message }, { status: 409 });
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("student enrollment failed", error); return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
