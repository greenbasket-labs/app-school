import { db } from "@/lib/db";

export async function getOperationalAnomalies(schoolId: string) {
  const [activeStudents, attendanceToday] = await Promise.all([
    db.student.count({ where: { schoolId, status: "ACTIVE" } }),
    db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "AttendanceRecord" WHERE "schoolId" = ${schoolId} AND "attendanceDate" = CURRENT_DATE`,
  ]);
  const recorded = Number(attendanceToday[0]?.count ?? 0n);
  const anomalies: Array<{ code: string; severity: "INFO" | "WARNING"; message: string }> = [];
  if (activeStudents > 0 && recorded === 0) anomalies.push({ code: "ATTENDANCE_NOT_RECORDED", severity: "WARNING", message: "No attendance has been recorded today for this school." });
  if (recorded > activeStudents && activeStudents > 0) anomalies.push({ code: "ATTENDANCE_COUNT_HIGH", severity: "INFO", message: "Attendance records today exceed the current active-student count; review corrections or historical enrollment context." });
  return anomalies;
}
