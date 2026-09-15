import { db } from "@/lib/db";

export async function getOperationalSummary(schoolId: string) {
  const [students, staff, todayAttendance, openInvoices, outstanding] = await Promise.all([
    db.student.count({ where: { schoolId, status: "ACTIVE" } }),
    db.membership.count({ where: { schoolId, status: "ACTIVE", isOwner: false } }),
    db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "AttendanceRecord" WHERE "schoolId" = ${schoolId} AND "attendanceDate" = CURRENT_DATE`,
    db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "StudentFeeInvoice" WHERE "schoolId" = ${schoolId} AND "status" = 'OPEN'`,
    db.$queryRaw<Array<{ amount: string }>>`SELECT COALESCE(SUM(i."amount" - COALESCE((SELECT SUM(p."amount") FROM "PaymentRecord" p WHERE p."invoiceId" = i."id"), 0)), 0)::text AS amount FROM "StudentFeeInvoice" i WHERE i."schoolId" = ${schoolId} AND i."status" = 'OPEN'`,
  ]);

  return {
    activeStudents: students,
    activeStaff: staff,
    attendanceRecordedToday: Number(todayAttendance[0]?.count ?? 0n),
    openInvoices: Number(openInvoices[0]?.count ?? 0n),
    outstandingAmount: outstanding[0]?.amount ?? "0",
  };
}
