import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export class SchoolStructureConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchoolStructureConflictError";
  }
}

export async function createClassLevel(input: {
  schoolId: string;
  name: string;
  order: number;
}) {
  try {
    return await db.classLevel.create({
      data: {
        schoolId: input.schoolId,
        name: input.name.trim(),
        order: input.order,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new SchoolStructureConflictError(
        "A class level with this name or order already exists for this school.",
      );
    }

    throw error;
  }
}

export async function getClassLevels(schoolId: string) {
  return db.classLevel.findMany({
    where: { schoolId },
    include: {
      arms: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { order: "asc" },
  });
}

export async function createClassArm(input: {
  schoolId: string;
  classLevelId: string;
  name: string;
}) {
  const level = await db.classLevel.findFirst({
    where: {
      id: input.classLevelId,
      schoolId: input.schoolId,
    },
    select: { id: true },
  });

  if (!level) {
    throw new Error("Class level does not belong to this school.");
  }

  try {
    return await db.classArm.create({
      data: {
        classLevelId: input.classLevelId,
        name: input.name.trim(),
      },
      include: {
        classLevel: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new SchoolStructureConflictError(
        "This class arm already exists for the class level.",
      );
    }

    throw error;
  }
}

export async function createSubject(input: {
  schoolId: string;
  name: string;
  code?: string | null;
}) {
  try {
    return await db.subject.create({
      data: {
        schoolId: input.schoolId,
        name: input.name.trim(),
        code: input.code?.trim() || null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new SchoolStructureConflictError(
        "A subject with this name or code already exists for this school.",
      );
    }

    throw error;
  }
}

export async function getSubjects(schoolId: string) {
  return db.subject.findMany({
    where: { schoolId },
    orderBy: { name: "asc" },
  });
}

export async function removeSubject(input: {
  schoolId: string;
  subjectId: string;
}) {
  const subject = await db.subject.findFirst({
    where: {
      id: input.subjectId,
      schoolId: input.schoolId,
    },
    include: {
      _count: {
        select: {
          classSubjects: true,
          assessments: true,
          assessmentScores: true,
        },
      },
    },
  });

  if (!subject) {
    throw new Error("Subject not found.");
  }

  if (
    subject._count.classSubjects > 0 ||
    subject._count.assessments > 0 ||
    subject._count.assessmentScores > 0
  ) {
    throw new SchoolStructureConflictError(
      "This subject is already being used and cannot be deleted.",
    );
  }

  await db.subject.delete({
    where: {
      id: subject.id,
    },
  });

  return subject;
}

export async function assignSubjectToClass(input: {
  schoolId: string;
  academicSessionId: string;
  classArmId: string;
  subjectId: string;
}) {
  const [session, arm, subject] = await Promise.all([
    db.academicSession.findFirst({
      where: {
        id: input.academicSessionId,
        schoolId: input.schoolId,
      },
      select: { id: true },
    }),

    db.classArm.findFirst({
      where: {
        id: input.classArmId,
        classLevel: {
          schoolId: input.schoolId,
        },
      },
      select: { id: true },
    }),

    db.subject.findFirst({
      where: {
        id: input.subjectId,
        schoolId: input.schoolId,
      },
      select: { id: true },
    }),
  ]);

  if (!session || !arm || !subject) {
    throw new Error(
      "Class, subject, and academic session must belong to this school.",
    );
  }

  try {
    return await db.classSubject.create({
      data: {
        academicSessionId: input.academicSessionId,
        classArmId: input.classArmId,
        subjectId: input.subjectId,
      },
      include: {
        classArm: {
          include: {
            classLevel: true,
          },
        },
        subject: true,
        academicSession: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new SchoolStructureConflictError(
        "This subject is already assigned to this class for the academic session.",
      );
    }

    throw error;
  }
}

export async function getClassSubjects(schoolId: string) {
  return db.classSubject.findMany({
    where: {
      classArm: {
        classLevel: {
          schoolId,
        },
      },
    },
    include: {
      classArm: {
        include: {
          classLevel: true,
        },
      },
      subject: true,
      academicSession: true,
    },
    orderBy: [
      {
        academicSession: {
          startsAt: "desc",
        },
      },
      {
        classArm: {
          classLevel: {
            order: "asc",
          },
        },
      },
      {
        classArm: {
          name: "asc",
        },
      },
      {
        subject: {
          name: "asc",
        },
      },
    ],
  });
}

export async function removeSubjectFromClass(input: {
  schoolId: string;
  assignmentId: string;
}) {
  const assignment = await db.classSubject.findFirst({
    where: {
      id: input.assignmentId,
      classArm: {
        classLevel: {
          schoolId: input.schoolId,
        },
      },
    },
    include: {
      classArm: {
        include: {
          classLevel: true,
        },
      },
      subject: true,
      academicSession: true,
    },
  });

  if (!assignment) {
    throw new Error("Subject assignment not found.");
  }

  await db.classSubject.delete({
    where: {
      id: assignment.id,
    },
  });

  return assignment;
}