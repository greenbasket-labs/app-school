import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { isSchoolModuleEnabled } from "@/domain/modules/service";
import { getManagementSummary } from "@/domain/reports/management-summary";
import { db } from "@/lib/db";

export default async function ManagementReportPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  const membership = await db.membership.findFirst({ where: { userId: session.user.id, schoolId, status: "ACTIVE" }, select: { capabilities: { select: { capability: { select: { code: true } } } } } });
  if (!membership || !membership.capabilities.some(({ capability }) => capability.code === CAPABILITIES.VIEW_ATTENDANCE) || !(await isSchoolModuleEnabled(schoolId, "REPORTS"))) redirect(`/app/schools/${schoolId}`);
  const report = await getManagementSummary(schoolId);

  return <main style={{ minHeight: "100vh", padding: 32 }}><div style={{ maxWidth: 900, margin: "0 auto" }}>
    <Link href={`/app/schools/${schoolId}/reports`} style={{ color: "#53615a" }}>← Reports</Link>
    <h1 style={{ marginTop: 24 }}>Management summary</h1>
    <p style={{ color: "#53615a" }}>A compact view of current school operations.</p>
    <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
      <Metric label="Active students" value={report.operations.activeStudents} />
      <Metric label="Active staff" value={report.operations.activeStaff} />
      <Metric label="Attendance today" value={report.operations.attendanceRecordedToday} />
      <Metric label="Open invoices" value={report.operations.openInvoices} />
      <Metric label="Outstanding" value={`₦${report.operations.outstandingAmount}`} />
    </div>
    <p style={{ marginTop: 24, color: "#53615a" }}>School status: {report.school.status}. Setup: {report.school.setupStatus.replaceAll("_", " ").toLowerCase()}.</p>
  </div></main>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div style={{ border: "1px solid #e0e6e2", borderRadius: 14, padding: 18, background: "white" }}><strong>{label}</strong><div style={{ fontSize: 26, marginTop: 8 }}>{value}</div></div>;
}
