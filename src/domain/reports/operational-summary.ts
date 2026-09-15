import { db } from "@/lib/db";

export async function getOperationalSummary(schoolId: string) {
  const [students, staff, todayAttendance, openInvoices, outstanding] = await Promise.all([
    db.student.count({ where: { schoolId, status: "ACTIVE" } }),
    db.membership.count({ where: { schoolId, status: "ACTIVE", isOwner: false } }),
    db.attendanceRecord.count({ where: { schoolId, attendanceDate: new Date(new Date().toISOString().slice(0, 10)) } }),
    db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "StudentFeeInvoice" WHERE "schoolId" = ${schoolId} AND "status" = 'OPEN'`,
    db.$queryRaw<Array<{ amount: string }>>`SELECT COALESCE(SUM(i."amount"), 0)::text AS amount FROM "StudentFeeInvoice" i WHERE i."schoolId" = ${schoolId} AND i."status" = 'OPEN' AND i."amount" > COALESCE((SELECT SUM(p."amount") FROM "PaymentRecord" p WHERE p."invoiceId" = i."id"), 0)`,
  ]);

  return {
    activeStudents: students,
    activeStaff: staff,
    attendanceRecordedToday: todayAttendance,
    openInvoices: Number(openInvoices[0]?.count ?? 0n),
    outstandingAmount: outstanding[0]?.amount ?? "0",
  };
}
