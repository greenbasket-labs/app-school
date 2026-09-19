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
  AdmissionStateError,
  approveAdmissionApplication,
  getAdmissionApplication,
  updateAdmissionApplication,
  updateAdmissionApplicationStatus,
} from "@/domain/admissions/service";
import {
  ModuleDisabledError,
  requireSchoolModule,
} from "@/domain/modules/guard";
import { db } from "@/lib/db";

const updateSchema = z.object({
  academicSessionId: z.string().uuid(),
  classLevelId: z.string().uuid(),
  classArmId: z.string().uuid().optional(),
  firstName: z.string().trim().min(1).max(100),
  middleName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().min(1).max(100),
  dateOfBirth: z.coerce.date().optional(),
});

const statusSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("UNDER_REVIEW"),
  }),
  z.object({
    status: z.literal("REJECTED"),
    rejectionReason: z.string().trim().min(1).max(1000),
  }),
  z.object({
    status: z.literal("WITHDRAWN"),
  }),
]);

const approveSchema = z.object({
  action: z.literal("APPROVE"),
  admissionNumber: z.string().trim().min(1).max(50),
});

async function access(schoolId: string, capability: string) {
  const session = await currentSession();

  if (!session) {
    throw new AuthorizationError("Authentication required.");
  }

  const membership = await requireCapability(
    session.user.id,
    schoolId,
    capability
  );

  await requireSchoolModule(membership.schoolId, "STUDENTS");

  return {
    session,
    membership,
  };
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      schoolId: string;
      applicationId: string;
    }>;
  }
) {
  try {
    const { schoolId, applicationId } = await params;

    const { membership } = await access(
      schoolId,
      CAPABILITIES.VIEW_STUDENTS
    );

    const application = await getAdmissionApplication(
      membership.schoolId,
      applicationId
    );

    return NextResponse.json({
      ok: true,
      application,
    });
  } catch (error) {
    if (error instanceof AdmissionNotFoundError) {
      return NextResponse.json(
        {
          ok: false,
          error: "NOT_FOUND",
          message: error.message,
        },
        { status: 404 }
      );
    }

    if (
      error instanceof AuthorizationError ||
      error instanceof ModuleDisabledError
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "FORBIDDEN",
          message: error.message,
        },
        { status: 403 }
      );
    }

    console.error("admission application get failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: "REQUEST_FAILED",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      schoolId: string;
      applicationId: string;
    }>;
  }
) {
  try {
    const { schoolId, applicationId } = await params;

    const { session, membership } = await access(
      schoolId,
      CAPABILITIES.MANAGE_STUDENTS
    );

    const body = await request.json();

    /*
     * APPROVE
     */
    if (body?.action === "APPROVE") {
      const input = approveSchema.parse(body);

      const result = await approveAdmissionApplication({
        schoolId: membership.schoolId,
        applicationId,
        reviewedByUserId: session.user.id,
        admissionNumber: input.admissionNumber,
      });

      await db.auditEvent.create({
        data: {
          schoolId: membership.schoolId,
          actorUserId: session.user.id,
          action: "admission_application.approved",
          entityType: "AdmissionApplication",
          entityId: applicationId,
          currentState: {
            status: result.application.status,
            studentId: result.student.id,
            admissionNumber: result.student.admissionNumber,
            enrollmentId: result.enrollment.id,
            academicSessionId: result.enrollment.academicSessionId,
            classArmId: result.enrollment.classArmId,
          },
        },
      });

      return NextResponse.json({
        ok: true,
        application: result.application,
        student: result.student,
        enrollment: result.enrollment,
      });
    }

    /*
     * STATUS CHANGE
     */
    if (body?.status) {
      const input = statusSchema.parse(body);

      const application = await updateAdmissionApplicationStatus({
        schoolId: membership.schoolId,
        applicationId,
        status: input.status,
        reviewedByUserId: session.user.id,
        rejectionReason:
          input.status === "REJECTED"
            ? input.rejectionReason
            : undefined,
      });

      await db.auditEvent.create({
        data: {
          schoolId: membership.schoolId,
          actorUserId: session.user.id,
          action: `admission_application.${input.status.toLowerCase()}`,
          entityType: "AdmissionApplication",
          entityId: applicationId,
          currentState: {
            status: application.status,
            rejectionReason: application.rejectionReason,
          },
        },
      });

      return NextResponse.json({
        ok: true,
        application,
      });
    }

    /*
     * EDIT APPLICATION
     */
    const input = updateSchema.parse(body);

    const application = await updateAdmissionApplication({
      schoolId: membership.schoolId,
      applicationId,
      ...input,
    });

    await db.auditEvent.create({
      data: {
        schoolId: membership.schoolId,
        actorUserId: session.user.id,
        action: "admission_application.updated",
        entityType: "AdmissionApplication",
        entityId: applicationId,
        currentState: {
          firstName: application.firstName,
          middleName: application.middleName,
          lastName: application.lastName,
          academicSessionId: application.academicSessionId,
          classLevelId: application.classLevelId,
          classArmId: application.classArmId,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      application,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_ADMISSION_DATA",
          issues: error.issues,
        },
        { status: 400 }
      );
    }

    if (error instanceof AdmissionNotFoundError) {
      return NextResponse.json(
        {
          ok: false,
          error: "NOT_FOUND",
          message: error.message,
        },
        { status: 404 }
      );
    }

    if (error instanceof AdmissionConflictError) {
      return NextResponse.json(
        {
          ok: false,
          error: "ADMISSION_CONFLICT",
          message: error.message,
        },
        { status: 409 }
      );
    }

    if (error instanceof AdmissionStateError) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_ADMISSION_STATE",
          message: error.message,
        },
        { status: 409 }
      );
    }

    if (
      error instanceof AuthorizationError ||
      error instanceof ModuleDisabledError
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "FORBIDDEN",
          message: error.message,
        },
        { status: 403 }
      );
    }

    console.error("admission application update failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: "REQUEST_FAILED",
      },
      { status: 500 }
    );
  }
}