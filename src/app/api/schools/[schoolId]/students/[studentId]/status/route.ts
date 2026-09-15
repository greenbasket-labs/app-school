import { NextResponse } from "next/server";
import { z } from "zod";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { requireCapability, AuthorizationError } from "@/domain/auth/authorize";
import { currentSession } from "@/domain/auth/session-cookie";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { changeStudentStatus, StudentStatusTransitionError } from "@/domain/students/service";
import { db } from "@/lib/db";

const schema = z.object({ status: z.enum(["ACTIVE", "INACTIVE", "WITHDRAWN"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ schoolId: string; studentId: string }> }) {
  try {
    const { schoolId, studentId } = await params;
    const session = await currentSession();
    if (!session) throw new AuthorizationError("Authentication required.");
    const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.MANAGE_STUDENTS);
    await requireSchoolModule(membership.schoolId, "STUDENTS");

    const { status } = schema.parse(await request.json());
    const result = await changeStudentStatus({ schoolId: membership.schoolId, studentId, status });

    if (result.changed) {
      await db.auditEvent.create({
        data: {
          schoolId: membership.schoolId,
          actorUserId: membership.userId,
          action: "student.status_changed",
          entityType: "Student",
          entityId: studentId,
          previousState: { status: result.previousStatus },
          currentState: { status: result.student.status },
        },
      });
    }

    return NextResponse.json({ ok: true, student: result.student, changed: result.changed });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_STUDENT_STATUS", issues: error.issues }, { status: 400 });
    if (error instanceof StudentStatusTransitionError) return NextResponse.json({ ok: false, error: "INVALID_STATUS_TRANSITION", message: error.message }, { status: 409 });
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("student status change failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
