import { NextResponse } from "next/server";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { isSchoolModuleEnabled } from "@/domain/modules/service";
import { getManagementSummary } from "@/domain/reports/management-summary";
import { db } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { schoolId } = await params;
  const membership = await db.membership.findFirst({ where: { userId: session.user.id, schoolId, status: "ACTIVE" }, select: { capabilities: { select: { capability: { select: { code: true } } } } } });
  const allowed = membership?.capabilities.some(({ capability }) => capability.code === CAPABILITIES.VIEW_ATTENDANCE) && await isSchoolModuleEnabled(schoolId, "REPORTS");
  if (!allowed) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const r = await getManagementSummary(schoolId);
  const rows = [
    ["metric", "value"],
    ["active_students", r.operations.activeStudents],
    ["active_staff", r.operations.activeStaff],
    ["attendance_recorded_today", r.operations.attendanceRecordedToday],
    ["open_invoices", r.operations.openInvoices],
    ["outstanding_amount", r.operations.outstandingAmount],
    ["school_status", r.school.status],
    ["setup_status", r.school.setupStatus],
    ["generated_at", r.generatedAt],
  ];
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="school-management-summary.csv"` } });
}
