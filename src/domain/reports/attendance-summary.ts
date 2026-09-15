import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type AttendanceSummary = {
  totals: { present: number; absent: number; late: number; excused: number; recorded: number };
  students: Array<{ studentId: string; admissionNumber: string; studentName: string; present: number; absent: number; late: number; excused: number; recorded: number }>;
};

export async function getAttendanceSummary(schoolId: string, from: string, to: string, classArmId?: string): Promise<AttendanceSummary> {
  const rows = await db.$queryRaw<Array<{
    studentId: string; admissionNumber: string; studentName: string; status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  }>>(Prisma.sql`
    SELECT ar."studentId", s."admissionNumber",
           CONCAT_WS(' ', s."firstName", s."middleName", s."lastName") AS "studentName",
           ar."status"
    FROM "AttendanceRecord" ar
    JOIN "Student" s ON s."id" = ar."studentId" AND s."schoolId" = ar."schoolId"
    WHERE ar."schoolId" = ${schoolId}::uuid
      AND ar."attendanceDate" BETWEEN ${from}::date AND ${to}::date
      ${classArmId ? Prisma.sql`AND ar."classArmId" = ${classArmId}::uuid` : Prisma.empty}
    ORDER BY s."lastName", s."firstName", ar."attendanceDate"
  `);

  const students = new Map<string, AttendanceSummary["students"][number]>();
  for (const row of rows) {
    const current = students.get(row.studentId) ?? { studentId: row.studentId, admissionNumber: row.admissionNumber, studentName: row.studentName, present: 0, absent: 0, late: 0, excused: 0, recorded: 0 };
    current[row.status.toLowerCase() as "present" | "absent" | "late" | "excused"] += 1;
    current.recorded += 1;
    students.set(row.studentId, current);
  }

  const result = [...students.values()];
  return {
    totals: result.reduce((totals, student) => ({ present: totals.present + student.present, absent: totals.absent + student.absent, late: totals.late + student.late, excused: totals.excused + student.excused, recorded: totals.recorded + student.recorded }), { present: 0, absent: 0, late: 0, excused: 0, recorded: 0 }),
    students: result,
  };
}
