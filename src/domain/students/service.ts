import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export class StudentConflictError extends Error {
  constructor(message: string) { super(message); this.name = "StudentConflictError"; }
}

export class StudentStatusTransitionError extends Error {
  constructor(message: string) { super(message); this.name = "StudentStatusTransitionError"; }
}

export type StudentLifecycleStatus = "ACTIVE" | "INACTIVE" | "WITHDRAWN";

export async function createStudent(input: {
  schoolId: string; admissionNumber: string; firstName: string; middleName?: string; lastName: string; dateOfBirth?: Date;
}) {
  try {
    return await db.student.create({ data: {
      schoolId: input.schoolId,
      admissionNumber: input.admissionNumber.trim(),
      firstName: input.firstName.trim(),
      middleName: input.middleName?.trim() || null,
      lastName: input.lastName.trim(),
      dateOfBirth: input.dateOfBirth,
    }});
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new StudentConflictError("A student with this admission number already exists in this school.");
    }
    throw error;
  }
}

export async function enrollStudent(input: { studentId: string; academicSessionId: string; classArmId: string }) {
  const [student, session, arm] = await Promise.all([
    db.student.findUnique({ where: { id: input.studentId }, select: { id: true, schoolId: true } }),
    db.academicSession.findUnique({ where: { id: input.academicSessionId }, select: { id: true, schoolId: true } }),
    db.classArm.findUnique({ where: { id: input.classArmId }, select: { id: true, classLevel: { select: { schoolId: true } } } }),
  ]);
  if (!student || !session || !arm || student.schoolId !== session.schoolId || student.schoolId !== arm.classLevel.schoolId) {
    throw new Error("Student, academic session, and class must belong to the same school.");
  }
  try {
    return await db.enrollment.create({ data: input, include: { student: true, academicSession: true, classArm: { include: { classLevel: true } } } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new StudentConflictError("This student is already enrolled for this academic session.");
    }
    throw error;
  }
}

export async function getStudents(schoolId: string) {
  return db.student.findMany({ where: { schoolId }, include: { enrollments: { include: { academicSession: true, classArm: { include: { classLevel: true } } }, orderBy: { enrolledAt: "desc" } } }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] });
}

export async function changeStudentStatus(input: {
  schoolId: string;
  studentId: string;
  status: StudentLifecycleStatus;
}) {
  const student = await db.student.findFirst({
    where: { id: input.studentId, schoolId: input.schoolId },
    select: { id: true, schoolId: true, status: true },
  });
  if (!student) throw new Error("Student not found.");

  const current = student.status as StudentLifecycleStatus;
  if (current === input.status) return { student, changed: false };

  const allowed: Record<StudentLifecycleStatus, StudentLifecycleStatus[]> = {
    ACTIVE: ["INACTIVE", "WITHDRAWN"],
    INACTIVE: ["ACTIVE", "WITHDRAWN"],
    WITHDRAWN: [],
  };

  if (!allowed[current].includes(input.status)) {
    throw new StudentStatusTransitionError(`Student status cannot move from ${current} to ${input.status}.`);
  }

  const updated = await db.student.update({
    where: { id: student.id },
    data: { status: input.status },
    select: { id: true, schoolId: true, status: true, admissionNumber: true, firstName: true, middleName: true, lastName: true },
  });

  return { student: updated, changed: true, previousStatus: current };
}
