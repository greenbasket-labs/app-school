import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import {
  AuthorizationError,
  requireCapability,
} from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import {
  assignSubjectToClass,
  getClassSubjects,
  removeSubjectFromClass,
  SchoolStructureConflictError,
} from "@/domain/school-structure/service";
import { db } from "@/lib/db";

const schema = z.object({
  academicSessionId: z.string().uuid(),
  classArmId: z.string().uuid(),
  subjectId: z.string().uuid(),
});

async function access(schoolId: string) {
  const session = await currentSession();

  if (!session) {
    throw new AuthorizationError("Authentication required.");
  }

  return requireCapability(
    session.user.id,
    schoolId,
    CAPABILITIES.MANAGE_SCHOOL,
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  try {
    const membership = await access((await params).schoolId);

    const assignments = await getClassSubjects(membership.schoolId);

    return NextResponse.json({
      ok: true,
      assignments,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        {
          ok: false,
          error: "FORBIDDEN",
          message: error.message,
        },
        { status: 403 },
      );
    }

    console.error("class subject list request failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: "REQUEST_FAILED",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  try {
    const membership = await access((await params).schoolId);

    const input = schema.parse(await request.json());

    const assignment = await assignSubjectToClass({
      schoolId: membership.schoolId,
      ...input,
    });

    await db.auditEvent.create({
      data: {
        schoolId: membership.schoolId,
        actorUserId: membership.userId,
        action: "class_subject.assigned",
        entityType: "ClassSubject",
        entityId: assignment.id,
        currentState: {
          academicSessionId: assignment.academicSessionId,
          classArmId: assignment.classArmId,
          subjectId: assignment.subjectId,
        },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        assignment,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_CLASS_SUBJECT_DATA",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    if (error instanceof SchoolStructureConflictError) {
      return NextResponse.json(
        {
          ok: false,
          error: "CLASS_SUBJECT_EXISTS",
          message: error.message,
        },
        { status: 409 },
      );
    }

    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        {
          ok: false,
          error: "FORBIDDEN",
          message: error.message,
        },
        { status: 403 },
      );
    }

    console.error("class subject request failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: "REQUEST_FAILED",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  try {
    const membership = await access((await params).schoolId);

    const url = new URL(request.url);
    const assignmentId = url.searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json(
        {
          ok: false,
          error: "ASSIGNMENT_ID_REQUIRED",
        },
        { status: 400 },
      );
    }

    const assignment = await removeSubjectFromClass({
      schoolId: membership.schoolId,
      assignmentId,
    });

    await db.auditEvent.create({
      data: {
        schoolId: membership.schoolId,
        actorUserId: membership.userId,
        action: "class_subject.removed",
        entityType: "ClassSubject",
        entityId: assignment.id,
        previousState: {
          academicSessionId: assignment.academicSessionId,
          classArmId: assignment.classArmId,
          subjectId: assignment.subjectId,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      assignment,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        {
          ok: false,
          error: "FORBIDDEN",
          message: error.message,
        },
        { status: 403 },
      );
    }

    console.error("class subject delete request failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: "REQUEST_FAILED",
      },
      { status: 500 },
    );
  }
}