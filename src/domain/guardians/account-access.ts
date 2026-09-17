import { db } from "@/lib/db";

export class GuardianAccountAuthorizationError extends Error {
  constructor(message = "Verified guardian access is required.") {
    super(message);
    this.name = "GuardianAccountAuthorizationError";
  }
}

export async function verifyGuardianAccount(input: {
  schoolId: string;
  guardianId: string;
  userId: string;
  actorUserId: string;
}) {
  const guardian = await db.guardian.findFirst({
    where: { id: input.guardianId, schoolId: input.schoolId },
    select: { id: true, userId: true, accountVerifiedAt: true },
  });
  const user = await db.user.findUnique({ where: { id: input.userId }, select: { id: true } });
  if (!guardian || !user) throw new GuardianAccountAuthorizationError("Guardian and account must exist in the requested context.");
  if (guardian.userId && guardian.userId !== input.userId) {
    throw new GuardianAccountAuthorizationError("This guardian is already linked to another account.");
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.guardian.update({
      where: { id: input.guardianId },
      data: {
        userId: input.userId,
        accountVerifiedAt: new Date(),
        accountVerifiedByUserId: input.actorUserId,
      },
      select: { id: true, schoolId: true, userId: true, accountVerifiedAt: true },
    });
    await tx.auditEvent.create({
      data: {
        schoolId: input.schoolId,
        actorUserId: input.actorUserId,
        action: "guardian.account_verified",
        entityType: "Guardian",
        entityId: input.guardianId,
        previousState: {
          userId: guardian.userId,
          accountVerifiedAt: guardian.accountVerifiedAt,
        },
        currentState: {
          userId: updated.userId,
          accountVerifiedAt: updated.accountVerifiedAt,
        },
      },
    });
    return updated;
  });
}

export async function removeGuardianAccountVerification(input: {
  schoolId: string;
  guardianId: string;
  actorUserId: string;
}) {
  const guardian = await db.guardian.findFirst({
    where: { id: input.guardianId, schoolId: input.schoolId },
    select: { id: true, userId: true, accountVerifiedAt: true, accountVerifiedByUserId: true },
  });
  if (!guardian) throw new GuardianAccountAuthorizationError("Guardian not found in this school.");

  return db.$transaction(async (tx) => {
    const updated = await tx.guardian.update({
      where: { id: input.guardianId },
      data: { userId: null, accountVerifiedAt: null, accountVerifiedByUserId: null },
      select: { id: true, schoolId: true, userId: true, accountVerifiedAt: true },
    });
    await tx.auditEvent.create({
      data: {
        schoolId: input.schoolId,
        actorUserId: input.actorUserId,
        action: "guardian.account_verification_removed",
        entityType: "Guardian",
        entityId: input.guardianId,
        previousState: {
          userId: guardian.userId,
          accountVerifiedAt: guardian.accountVerifiedAt,
          accountVerifiedByUserId: guardian.accountVerifiedByUserId,
        },
        currentState: { userId: null, accountVerifiedAt: null },
      },
    });
    return updated;
  });
}

export async function listVerifiedGuardianChildren(schoolId: string, userId: string) {
  const rows = await db.student.findMany({
    where: {
      schoolId,
      studentGuardians: {
        some: {
          schoolId,
          guardian: {
            userId,
            accountVerifiedAt: { not: null },
          },
        },
      },
    },
    select: {
      id: true,
      admissionNumber: true,
      firstName: true,
      middleName: true,
      lastName: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  if (!rows.length) {
    const verifiedGuardian = await db.guardian.findFirst({
      where: { schoolId, userId, accountVerifiedAt: { not: null } },
      select: { id: true },
    });
    if (!verifiedGuardian) throw new GuardianAccountAuthorizationError();
  }

  return rows;
}

export async function requireVerifiedGuardianChildAccess(input: {
  schoolId: string;
  userId: string;
  studentId: string;
}) {
  const link = await db.studentGuardian.findFirst({
    where: {
      schoolId: input.schoolId,
      studentId: input.studentId,
      guardian: {
        schoolId: input.schoolId,
        userId: input.userId,
        accountVerifiedAt: { not: null },
      },
    },
    select: { guardianId: true, studentId: true },
  });
  if (!link) throw new GuardianAccountAuthorizationError("You are not verified as a guardian for this student in this school.");
  return link;
}
