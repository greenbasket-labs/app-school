import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import {
  AuthorizationError,
  requireCapability,
} from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import {
  AdmissionConflictError,
  AdmissionNotFoundError,
  createAdmissionApplication,
  getAdmissionApplications,
  getApplicantAdmissionApplications,
} from "@/domain/admissions/service";
import {
  ModuleDisabledError,
  requireSchoolModule,
} from "@/domain/modules/guard";
import { db } from "@/lib/db";

const schema = z.object({
  academicSessionId: z.string().uuid(),
  classLevelId: z.string().uuid(),
  classArmId: z.string().uuid().optional(),
  firstName: z.string().trim().min(1).max(100),
  middleName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().min(1).max(100),
  dateOfBirth: z.coerce.date().optional(),
});

async function access(schoolId: string, capability: string) {
  const session = await currentSession();

  if (!session) {
    throw new AuthorizationError("Authentication required.");
  }

  const membership = await requireCapability(
    session.user.id,
    schoolId,
    capability,
  );

  await requireSchoolModule(membership.schoolId, "STUDENTS");

  return { session, membership };
}

async function applicantAccess(schoolId: string) {
  const session = await currentSession();

  if (!session) {
    throw new AuthorizationError("Authentication required.");
  }

  const school = await db.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true, status: true },
  });

  if (!school) {
    throw new AdmissionNotFoundError("School not found.");
  }

  await requireSchoolModule(school.id, "STUDENTS");

  return { session, school };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  try {
    const { schoolId } = await params;
    const session = await currentSession();

    if (!session) {
      throw new AuthorizationError("Authentication required.");
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;

    try {
      const { membership } = await access(schoolId, CAPABILITIES.VIEW_STUDENTS);
      const allowedStatuses = [
        "PENDING",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "WITHDRAWN",
      ] as const;

      if (
        status &&
        !allowedStatuses.includes(
          status as (typeof allowedStatuses)[number],
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "INVALID_STATUS",
            message: "Invalid admission application status.",
          },
          { status: 400 },
        );
      }

      const applications = await getAdmissionApplications(
        membership.schoolId,
        status as (typeof allowedStatuses)[number] | undefined,
      );

      return NextResponse.json({ ok: true, applications });
    } catch (error) {
      if (!(error instanceof AuthorizationError)) {
        throw error;
      }

      const { school } = await applicantAccess(schoolId);
      const applications = await getApplicantAdmissionApplications(
        school.id,
        session.user.id,
      );

      return NextResponse.json({ ok: true, applications });
    }
  } catch (error) {
    if (error instanceof AdmissionNotFoundError) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND", message: error.message },
        { status: 404 },
      );
    }

    if (
      error instanceof AuthorizationError ||
      error instanceof ModuleDisabledError
    ) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN", message: error.message },
        { status: 403 },
      );
    }

    console.error("admission application list failed", error);
    return NextResponse.json(
      { ok: false, error: "REQUEST_FAILED" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  try {
    const { schoolId } = await params;
    const { session, school } = await applicantAccess(schoolId);
    const input = schema.parse(await request.json());

    const application = await createAdmissionApplication({
      schoolId: school.id,
      applicantUserId: session.user.id,
      ...input,
    });

    await db.auditEvent.create({
      data: {
        schoolId: school.id,
        actorUserId: session.user.id,
        action: "admission_application.created",
        entityType: "AdmissionApplication",
        entityId: application.id,
        currentState: {
          status: application.status,
          firstName: application.firstName,
          lastName: application.lastName,
          academicSessionId: application.academicSessionId,
          classLevelId: application.classLevelId,
          classArmId: application.classArmId,
        },
      },
    });

    return NextResponse.json({ ok: true, application }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ADMISSION_DATA", issues: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof AdmissionConflictError) {
      return NextResponse.json(
        { ok: false, error: "ADMISSION_CONFLICT", message: error.message },
        { status: 409 },
      );
    }

    if (error instanceof AdmissionNotFoundError) {
      return NextResponse.json(
        {
          ok: false,
          error: "ADMISSION_REFERENCE_NOT_FOUND",
          message: error.message,
        },
        { status: 404 },
      );
    }

    if (
      error instanceof AuthorizationError ||
      error instanceof ModuleDisabledError
    ) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN", message: error.message },
        { status: 403 },
      );
    }

    console.error("admission application create failed", error);
    return NextResponse.json(
      { ok: false, error: "REQUEST_FAILED" },
      { status: 500 },
    );
  }
}
