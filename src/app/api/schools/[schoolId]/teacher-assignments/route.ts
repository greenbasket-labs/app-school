import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import {
  createTeacherAssignment,
  endTeacherAssignment,
  TeacherAssignmentAuthorizationError,
  TeacherAssignmentValidationError,
} from "@/domain/teacher-assignments/service";
import { db } from "@/lib/db";

const createSchema = z.object({
  membershipId: z.string().uuid(),
  academicSessionId: z.string().uuid(),
  academicTermId: z.string().uuid(),
  classArmId: z.string().uuid(),
  subjectId: z.string().uuid(),
});

const endSchema = z.object({ assignmentId: z.string().uuid() });

async function requireOwner(schoolId: string) {
  const session = await currentSession();
  if (!session) throw new AuthorizationError("Authentication required.");
  return requireCapability(session.user.id, schoolId, CAPABILITIES.MANAGE_SCHOOL);
}

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const membership = await requireOwner((await params).schoolId);
    const schoolId = membership.schoolId;

    const [teachers, sessions, classLevels, subjects, classSubjects] = await Promise.all([
      db.membership.findMany({
        where: { schoolId, status: "ACTIVE", isOwner: false, relationship: "TEACHER" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          user: { select: { email: true } },
          teacherAssignments: {
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              academicSession: { select: { id: true, name: true } },
              academicTerm: { select: { id: true, name: true } },
              classArm: { select: { id: true, name: true, classLevel: { select: { name: true } } } },
              subject: { select: { id: true, name: true } },
            },
          },
        },
      }),
      db.academicSession.findMany({
        where: { schoolId },
        orderBy: { startsAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          terms: { orderBy: { order: "asc" }, select: { id: true, name: true, order: true } },
        },
      }),
      db.classLevel.findMany({
        where: { schoolId },
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          order: true,
          arms: { orderBy: { name: "asc" }, select: { id: true, name: true } },
        },
      }),
      db.subject.findMany({
        where: { schoolId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      }),
      db.classSubject.findMany({
        where: { academicSession: { schoolId } },
        select: { academicSessionId: true, classArmId: true, subjectId: true },
      }),
    ]);

    return NextResponse.json({ ok: true, teachers, sessions, classLevels, subjects, classSubjects });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof TeacherAssignmentAuthorizationError) {
      return NextResponse.json({ ok: false, error: "OWNER_REQUIRED" }, { status: 403 });
    }
    console.error("teacher assignment management read failed", error);
    return NextResponse.json({ ok: false, error: "TEACHER_ASSIGNMENTS_READ_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const membership = await requireOwner((await params).schoolId);
    const input = createSchema.parse(await request.json());
    const assignment = await createTeacherAssignment({ ...input, schoolId: membership.schoolId, actorUserId: membership.userId });
    return NextResponse.json({ ok: true, assignment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_TEACHER_ASSIGNMENT" }, { status: 400 });
    if (error instanceof AuthorizationError || error instanceof TeacherAssignmentAuthorizationError) return NextResponse.json({ ok: false, error: "OWNER_REQUIRED" }, { status: 403 });
    if (error instanceof TeacherAssignmentValidationError) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    console.error("teacher assignment creation failed", error);
    return NextResponse.json({ ok: false, error: "TEACHER_ASSIGNMENT_CREATE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const membership = await requireOwner((await params).schoolId);
    const input = endSchema.parse(await request.json());
    const assignment = await endTeacherAssignment({ ...input, schoolId: membership.schoolId, actorUserId: membership.userId });
    return NextResponse.json({ ok: true, assignment });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_TEACHER_ASSIGNMENT" }, { status: 400 });
    if (error instanceof AuthorizationError || error instanceof TeacherAssignmentAuthorizationError) return NextResponse.json({ ok: false, error: "OWNER_REQUIRED" }, { status: 403 });
    if (error instanceof TeacherAssignmentValidationError) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    console.error("teacher assignment ending failed", error);
    return NextResponse.json({ ok: false, error: "TEACHER_ASSIGNMENT_END_FAILED" }, { status: 500 });
  }
}
