import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export class StudentConflictError extends Error {
  constructor(message: string) { super(message); this.name = "StudentConflictError"; }
}

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
