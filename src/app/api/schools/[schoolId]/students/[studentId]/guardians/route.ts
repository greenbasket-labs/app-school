import { NextResponse } from "next/server";
import { z } from "zod";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { requireCapability, AuthorizationError } from "@/domain/auth/authorize";
import { currentSession } from "@/domain/auth/session-cookie";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";
import { linkGuardianToStudent, unlinkGuardianFromStudent } from "@/domain/guardians/service";

const schema = z.object({
  guardianId: z.string().uuid(),
  relationship: z.string().trim().max(60).optional(),
  isPrimary: z.boolean().optional(),
});

async function access(schoolId: string) {
  const session = await currentSession();
  if (!session) throw new AuthorizationError("Authentication required.");
  const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.MANAGE_STUDENTS);
  await requireSchoolModule(membership.schoolId, "STUDENTS");
  return membership;
}

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string; studentId: string }> }) {
  try {
    const { schoolId, studentId } = await params;
    const membership = await access(schoolId);
    const student = await db.student.findFirst({
      where: { id: studentId, schoolId: membership.schoolId },
      include: {
        studentGuardians: {
          include: { guardian: true },
          orderBy: { guardian: { fullName: "asc" } },
        },
      },
    });
    if (!student) return NextResponse.json({ ok: false, error: "STUDENT_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true, guardians: student.studentGuardians });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("student guardians list failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string; studentId: string }> }) {
  try {
    const { schoolId, studentId } = await params;
    const membership = await access(schoolId);
    const input = schema.parse(await request.json());
    const link = await linkGuardianToStudent({ schoolId: membership.schoolId, studentId, ...input });
    await db.auditEvent.create({
      data: {
        schoolId: membership.schoolId,
        actorUserId: membership.userId,
        action: "guardian.linked_to_student",
        entityType: "StudentGuardian",
        entityId: `${studentId}:${input.guardianId}`,
        currentState: { studentId, guardianId: input.guardianId, relationship: link.relationship, isPrimary: link.isPrimary },
      },
    });
    return NextResponse.json({ ok: true, link }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_GUARDIAN_LINK", issues: error.issues }, { status: 400 });
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("student guardian link failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ schoolId: string; studentId: string }> }) {
  try {
    const { schoolId, studentId } = await params;
    const membership = await access(schoolId);
    const guardianId = new URL(request.url).searchParams.get("guardianId");
    if (!guardianId || !z.string().uuid().safeParse(guardianId).success) {
      return NextResponse.json({ ok: false, error: "INVALID_GUARDIAN_ID" }, { status: 400 });
    }
    await unlinkGuardianFromStudent({ schoolId: membership.schoolId, studentId, guardianId });
    await db.auditEvent.create({
      data: {
        schoolId: membership.schoolId,
        actorUserId: membership.userId,
        action: "guardian.unlinked_from_student",
        entityType: "StudentGuardian",
        entityId: `${studentId}:${guardianId}`,
        previousState: { studentId, guardianId },
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("student guardian unlink failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
