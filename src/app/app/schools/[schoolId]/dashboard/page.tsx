import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { isSchoolModuleEnabled } from "@/domain/modules/service";
import { getOperationalSummary } from "@/domain/reports/operational-summary";
import { db } from "@/lib/db";

export default async function DashboardPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: { school: { select: { name: true } }, capabilities: { select: { capability: { select: { code: true } } } } },
  });
  if (!membership) redirect("/app");
  const canViewReports = membership.capabilities.some(({ capability }) => capability.code === CAPABILITIES.VIEW_ATTENDANCE);
  if (!canViewReports || !(await isSchoolModuleEnabled(schoolId, "REPORTS"))) redirect(`/app/schools/${schoolId}`);
  const summary = await getOperationalSummary(schoolId);

  return (
    <main style={{ minHeight: "100vh", padding: 32 }}><div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <Link href={`/app/schools/${schoolId}/reports`} style={{ color: "#53615a" }}>← Reports</Link>
      <h1 style={{ marginTop: 24 }}>Operational dashboard</h1>
      <p style={{ color: "#53615a" }}>{membership.school.name} · current recorded state</p>
      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {[
          ["Active students", summary.activeStudents],
          ["Active staff", summary.activeStaff],
          ["Attendance today", summary.attendanceRecordedToday],
          ["Open invoices", summary.openInvoices],
          ["Outstanding", `₦${summary.outstandingAmount}`],
        ].map(([label, value]) => <div key={String(label)} style={{ border: "1px solid #e0e6e2", borderRadius: 14, padding: 18, background: "white" }}><strong>{label}</strong><div style={{ fontSize: 28, marginTop: 8 }}>{value}</div></div>)}
      </div>
      <p style={{ marginTop: 24, color: "#53615a" }}>This view is derived from authoritative school records. It does not create or change operational data.</p>
    </div></main>
  );
}
