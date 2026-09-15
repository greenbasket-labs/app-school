import { Prisma } from "@prisma/client";
import { notifyParentsOfAbsence } from "@/domain/communication/student-alerts";
import { db } from "@/lib/db";

export type AttendanceInput = {
  schoolId: string;
  academicSessionId: string;
  classArmId: string;
  studentId: string;
  enrollmentId: string;
  attendanceDate: Date;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  note?: string;
  recordedByUserId: string;
};

export class AttendanceConflictError extends Error {
  constructor(message: string) { super(message); this.name = "AttendanceConflictError"; }
}

export async function recordAttendance(input: AttendanceInput) {
  const enrollment = await db.enrollment.findFirst({
    where: { id: input.enrollmentId, studentId: input.studentId, academicSessionId: input.academicSessionId, classArmId: input.classArmId, status: "ACTIVE", student: { schoolId: input.schoolId } },
  });
  if (!enrollment) throw new Error("Active enrollment for this student, class and session is required.");
  try {
    const record = await db.attendanceRecord.create({ data: input });
    if (input.status === "ABSENT") {
      await notifyParentsOfAbsence(input.schoolId, input.studentId, input.recordedByUserId, input.attendanceDate);
    }
    return record;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AttendanceConflictError("Attendance has already been recorded for this student and date.");
    throw error;
  }
}

export async function getClassAttendance(schoolId: string, classArmId: string, attendanceDate: Date) {
  return db.attendanceRecord.findMany({
    where: { schoolId, classArmId, attendanceDate },
    include: { student: { select: { id: true, admissionNumber: true, firstName: true, middleName: true, lastName: true } } },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
  });
}
