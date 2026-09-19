import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export class AdmissionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdmissionConflictError";
  }
}

export class AdmissionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdmissionNotFoundError";
  }
}

export class AdmissionStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdmissionStateError";
  }
}

export type AdmissionApplicationStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN";

export async function createAdmissionApplication(input: {
  schoolId: string;
  applicantUserId: string;
  academicSessionId: string;
  classLevelId: string;
  classArmId?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth?: Date;
}) {
  const [school, applicant, session, classLevel, classArm] =
    await Promise.all([
      db.school.findUnique({
        where: { id: input.schoolId },
        select: { id: true },
      }),

      db.user.findUnique({
        where: { id: input.applicantUserId },
        select: { id: true },
      }),

      db.academicSession.findUnique({
        where: { id: input.academicSessionId },
        select: { id: true, schoolId: true, status: true },
      }),

      db.classLevel.findUnique({
        where: { id: input.classLevelId },
        select: { id: true, schoolId: true },
      }),

      input.classArmId
        ? db.classArm.findUnique({
            where: { id: input.classArmId },
            select: {
              id: true,
              classLevelId: true,
              classLevel: {
                select: { schoolId: true },
              },
            },
          })
        : null,
    ]);

  if (!school) {
    throw new AdmissionNotFoundError("School not found.");
  }

  if (!applicant) {
    throw new AdmissionNotFoundError("Applicant account not found.");
  }

  if (!session || session.schoolId !== input.schoolId) {
    throw new AdmissionConflictError(
      "The academic session does not belong to this school."
    );
  }

  if (!classLevel || classLevel.schoolId !== input.schoolId) {
    throw new AdmissionConflictError(
      "The class level does not belong to this school."
    );
  }

  if (classArm) {
    if (
      classArm.classLevelId !== input.classLevelId ||
      classArm.classLevel.schoolId !== input.schoolId
    ) {
      throw new AdmissionConflictError(
        "The selected class does not belong to the selected class level and school."
      );
    }
  }

  if (input.classArmId && !classArm) {
    throw new AdmissionNotFoundError("Selected class not found.");
  }

  const firstName = input.firstName.trim();
  const middleName = input.middleName?.trim() || null;
  const lastName = input.lastName.trim();

  if (!firstName || !lastName) {
    throw new AdmissionConflictError(
      "First name and last name are required."
    );
  }

  return db.admissionApplication.create({
    data: {
      schoolId: input.schoolId,
      applicantUserId: input.applicantUserId,
      academicSessionId: input.academicSessionId,
      classLevelId: input.classLevelId,
      classArmId: input.classArmId || null,
      firstName,
      middleName,
      lastName,
      dateOfBirth: input.dateOfBirth,
      status: "PENDING",
    },
    include: {
      school: true,
      academicSession: true,
      classLevel: true,
      classArm: true,
      applicant: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
}

export async function getAdmissionOptions(schoolId: string) {
  const [sessions, classLevels, classArms] = await Promise.all([
    db.academicSession.findMany({
      where: { schoolId, status: "ACTIVE" },
      select: { id: true, name: true, status: true },
      orderBy: { startsAt: "desc" },
    }),
    db.classLevel.findMany({
      where: { schoolId },
      select: { id: true, name: true, order: true },
      orderBy: { order: "asc" },
    }),
    db.classArm.findMany({
      where: { classLevel: { schoolId } },
      select: {
        id: true,
        name: true,
        classLevelId: true,
        classLevel: { select: { name: true } },
      },
      orderBy: [
        { classLevel: { order: "asc" } },
        { name: "asc" },
      ],
    }),
  ]);

  return { sessions, classLevels, classArms };
}

export async function getApplicantAdmissionApplications(
  schoolId: string,
  applicantUserId: string,
) {
  return db.admissionApplication.findMany({
    where: { schoolId, applicantUserId },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      dateOfBirth: true,
      status: true,
      submittedAt: true,
      academicSession: { select: { id: true, name: true } },
      classLevel: { select: { id: true, name: true } },
      classArm: { select: { id: true, name: true } },
      student: {
        select: { id: true, admissionNumber: true },
      },
    },
    orderBy: { submittedAt: "desc" },
  });
}

export async function getAdmissionApplications(
  schoolId: string,
  status?: AdmissionApplicationStatus
) {
  return db.admissionApplication.findMany({
    where: {
      schoolId,
      ...(status ? { status } : {}),
    },
    include: {
      academicSession: true,
      classLevel: true,
      classArm: true,
      applicant: {
        select: {
          id: true,
          email: true,
        },
      },
      student: true,
    },
    orderBy: {
      submittedAt: "desc",
    },
  });
}

export async function getAdmissionApplication(
  schoolId: string,
  applicationId: string
) {
  const application = await db.admissionApplication.findFirst({
    where: {
      id: applicationId,
      schoolId,
    },
    include: {
      school: true,
      academicSession: true,
      classLevel: true,
      classArm: true,
      applicant: {
        select: {
          id: true,
          email: true,
        },
      },
      reviewer: {
        select: {
          id: true,
          email: true,
        },
      },
      student: true,
    },
  });

  if (!application) {
    throw new AdmissionNotFoundError("Admission application not found.");
  }

  return application;
}

export async function updateAdmissionApplicationStatus(input: {
  schoolId: string;
  applicationId: string;
  status: "UNDER_REVIEW" | "REJECTED" | "WITHDRAWN";
  reviewedByUserId?: string;
  rejectionReason?: string;
}) {
  const application = await db.admissionApplication.findFirst({
    where: {
      id: input.applicationId,
      schoolId: input.schoolId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!application) {
    throw new AdmissionNotFoundError("Admission application not found.");
  }

  if (application.status === "APPROVED") {
    throw new AdmissionStateError(
      "An approved admission application cannot be changed."
    );
  }

  if (application.status === "REJECTED") {
    throw new AdmissionStateError(
      "A rejected admission application cannot be changed."
    );
  }

  if (application.status === "WITHDRAWN") {
    throw new AdmissionStateError(
      "A withdrawn admission application cannot be changed."
    );
  }

  if (
    input.status === "REJECTED" &&
    !input.rejectionReason?.trim()
  ) {
    throw new AdmissionConflictError(
      "A rejection reason is required when rejecting an application."
    );
  }

  return db.admissionApplication.update({
    where: {
      id: application.id,
    },
    data: {
      status: input.status,
      reviewedAt: input.reviewedByUserId ? new Date() : undefined,
      reviewedByUserId: input.reviewedByUserId || null,
      rejectionReason:
        input.status === "REJECTED"
          ? input.rejectionReason?.trim() || null
          : null,
    },
    include: {
      academicSession: true,
      classLevel: true,
      classArm: true,
      applicant: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
}

export async function updateAdmissionApplication(input: {
  schoolId: string;
  applicationId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth?: Date;
  academicSessionId: string;
  classLevelId: string;
  classArmId?: string;
}) {
  const application = await db.admissionApplication.findFirst({
    where: {
      id: input.applicationId,
      schoolId: input.schoolId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!application) {
    throw new AdmissionNotFoundError("Admission application not found.");
  }

  if (
    application.status === "APPROVED" ||
    application.status === "REJECTED" ||
    application.status === "WITHDRAWN"
  ) {
    throw new AdmissionStateError(
      "This admission application can no longer be edited."
    );
  }

  const [session, classLevel, classArm] = await Promise.all([
    db.academicSession.findUnique({
      where: { id: input.academicSessionId },
      select: {
        id: true,
        schoolId: true,
      },
    }),

    db.classLevel.findUnique({
      where: { id: input.classLevelId },
      select: {
        id: true,
        schoolId: true,
      },
    }),

    input.classArmId
      ? db.classArm.findUnique({
          where: { id: input.classArmId },
          select: {
            id: true,
            classLevelId: true,
            classLevel: {
              select: {
                schoolId: true,
              },
            },
          },
        })
      : null,
  ]);

  if (!session || session.schoolId !== input.schoolId) {
    throw new AdmissionConflictError(
      "The academic session does not belong to this school."
    );
  }

  if (!classLevel || classLevel.schoolId !== input.schoolId) {
    throw new AdmissionConflictError(
      "The class level does not belong to this school."
    );
  }

  if (input.classArmId && !classArm) {
    throw new AdmissionNotFoundError("Selected class not found.");
  }

  if (
    classArm &&
    (classArm.classLevelId !== input.classLevelId ||
      classArm.classLevel.schoolId !== input.schoolId)
  ) {
    throw new AdmissionConflictError(
      "The selected class does not belong to the selected class level."
    );
  }

  const firstName = input.firstName.trim();
  const middleName = input.middleName?.trim() || null;
  const lastName = input.lastName.trim();

  if (!firstName || !lastName) {
    throw new AdmissionConflictError(
      "First name and last name are required."
    );
  }

  return db.admissionApplication.update({
    where: {
      id: application.id,
    },
    data: {
      firstName,
      middleName,
      lastName,
      dateOfBirth: input.dateOfBirth,
      academicSessionId: input.academicSessionId,
      classLevelId: input.classLevelId,
      classArmId: input.classArmId || null,
    },
    include: {
      academicSession: true,
      classLevel: true,
      classArm: true,
      applicant: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
}

function generatedAdmissionNumber(prefix: string, sequence: number) {
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

function fallbackSchoolPrefix(schoolType: string) {
  const normalized = schoolType.trim().toUpperCase();

  const known = {
    NURSERY: "NUR",
    PRIMARY: "PRI",
    JSS: "JSS",
    SS: "SS",
  } as const;

  if (normalized in known) {
    return known[normalized as keyof typeof known];
  }

  return "STU";
}

export async function approveAdmissionApplication(input: {
  schoolId: string;
  applicationId: string;
  reviewedByUserId: string;
}) {
  let attempt = 0;

  while (attempt < 5) {
    attempt += 1;

    try {
      return await db.$transaction(async (tx) => {
        const application = await tx.admissionApplication.findFirst({
          where: {
            id: input.applicationId,
            schoolId: input.schoolId,
          },
          include: {
            academicSession: true,
            classLevel: true,
            classArm: true,
          },
        });

        if (!application) {
          throw new AdmissionNotFoundError(
            "Admission application not found."
          );
        }

        if (application.status === "APPROVED") {
          throw new AdmissionStateError(
            "This admission application has already been approved."
          );
        }

        if (application.status === "REJECTED") {
          throw new AdmissionStateError(
            "A rejected admission application cannot be approved."
          );
        }

        if (application.status === "WITHDRAWN") {
          throw new AdmissionStateError(
            "A withdrawn admission application cannot be approved."
          );
        }

        if (application.schoolId !== application.academicSession.schoolId) {
          throw new AdmissionConflictError(
            "The academic session does not belong to this school."
          );
        }

        if (application.classLevel.schoolId !== application.schoolId) {
          throw new AdmissionConflictError(
            "The class level does not belong to this school."
          );
        }

        if (!application.classArmId || !application.classArm) {
          throw new AdmissionConflictError(
            "A class must be selected before approving this admission."
          );
        }

        if (
          application.classArm.classLevelId !== application.classLevelId
        ) {
          throw new AdmissionConflictError(
            "The selected class does not belong to the requested class level."
          );
        }

        const school = await tx.school.findUnique({
          where: { id: application.schoolId },
          select: {
            id: true,
            schoolType: true,
            admissionPrefix: true,
            admissionSequence: true,
          },
        });

        if (!school) {
          throw new AdmissionNotFoundError("School not found.");
        }

        const prefix =
          school.admissionPrefix?.trim().toUpperCase() ||
          fallbackSchoolPrefix(school.schoolType);

        const sequence = school.admissionSequence + 1;

        const admissionNumber = generatedAdmissionNumber(
          prefix,
          application.submittedAt.getUTCFullYear(),
          school.schoolType,
          sequence,
        );

        await tx.school.update({
          where: { id: school.id },
          data: { admissionSequence: sequence },
        });

        const student = await tx.student.create({
          data: {
            schoolId: application.schoolId,
            schoolTypeAtAdmission: school.schoolType,
            admissionNumber,
            firstName: application.firstName,
            middleName: application.middleName,
            lastName: application.lastName,
            dateOfBirth: application.dateOfBirth,
            status: "ACTIVE",
          },
        });

        const enrollment = await tx.enrollment.create({
          data: {
            studentId: student.id,
            academicSessionId: application.academicSessionId,
            classArmId: application.classArmId,
            status: "ACTIVE",
          },
          include: {
            student: true,
            academicSession: true,
            classArm: {
              include: {
                classLevel: true,
              },
            },
          },
        });

        const approvedApplication = await tx.admissionApplication.update({
          where: {
            id: application.id,
          },
          data: {
            status: "APPROVED",
            reviewedAt: new Date(),
            reviewedByUserId: input.reviewedByUserId,
            studentId: student.id,
            rejectionReason: null,
          },
          include: {
            student: true,
            academicSession: true,
            classLevel: true,
            classArm: true,
          },
        });

        return {
          application: approvedApplication,
          student,
          enrollment,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        attempt < 5
      ) {
        continue;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AdmissionConflictError(
          "Could not generate a unique admission number. Please try again."
        );
      }

      throw error;
    }
  }

  throw new AdmissionConflictError(
    "Could not generate a unique admission number. Please try again."
  );
}
