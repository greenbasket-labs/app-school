import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type BulkAttendanceItem = {
  studentId: string;
  enrollmentId: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  note?: string;
};

export async function getAttendanceRoster(input: {
  schoolId: string;
  academicSessionId: string;
  classArmId: string;
  attendanceDate: Date;
}) {
  const enrollments = await db.enrollment.findMany({
    where: { academicSessionId: input.academicSessionId, classArmId: input.classArmId, status: "ACTIVE", student: { schoolId: input.schoolId, status: "ACTIVE" } },
    select: { id: true, studentId: true, student: { select: { id: true, admissionNumber: true, firstName: true, middleName: true, lastName: true } } },
    orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
  });
  const records = await db.attendanceRecord.findMany({
    where: { schoolId: input.schoolId, academicSessionId: input.academicSessionId, classArmId: input.classArmId, attendanceDate: input.attendanceDate },
    select: { id: true, studentId: true, enrollmentId: true, status: true, note: true },
  });
  const byStudent = new Map(records.map((record) => [record.studentId, record]));
  return enrollments.map((enrollment) => ({ ...enrollment, attendance: byStudent.get(enrollment.studentId) ?? null }));
}

export async function saveBulkAttendance(input: {
  schoolId: string;
  academicSessionId: string;
  classArmId: string;
  attendanceDate: Date;
  recordedByUserId: string;
  items: BulkAttendanceItem[];
}) {
  const enrollmentIds = input.items.map((item) => item.enrollmentId);
  const enrollments = await db.enrollment.findMany({
    where: { id: { in: enrollmentIds }, academicSessionId: input.academicSessionId, classArmId: input.classArmId, status: "ACTIVE", student: { schoolId: input.schoolId, status: "ACTIVE" } },
    select: { id: true, studentId: true },
  });
  const valid = new Map(enrollments.map((enrollment) => [enrollment.id, enrollment.studentId]));
  if (valid.size !== input.items.length || input.items.some((item) => valid.get(item.enrollmentId) !== item.studentId)) {
    throw new Error("Every attendance item must belong to an active student enrollment in the selected class and session.");
  }
  try {
    return await db.$transaction(async (tx) => {
      const saved = [];
      for (const item of input.items) {
        saved.push(await tx.attendanceRecord.upsert({
          where: { studentId_attendanceDate: { studentId: item.studentId, attendanceDate: input.attendanceDate } },
          create: { schoolId: input.schoolId, academicSessionId: input.academicSessionId, classArmId: input.classArmId, studentId: item.studentId, enrollmentId: item.enrollmentId, attendanceDate: input.attendanceDate, status: item.status, note: item.note?.trim() || null, recordedByUserId: input.recordedByUserId },
          update: { status: item.status, note: item.note?.trim() || null, enrollmentId: item.enrollmentId, classArmId: input.classArmId, academicSessionId: input.academicSessionId, recordedByUserId: input.recordedByUserId, recordedAt: new Date() },
        }));
      }
      return saved;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Error("Attendance could not be saved because of a conflicting record.");
    throw error;
  }
}
