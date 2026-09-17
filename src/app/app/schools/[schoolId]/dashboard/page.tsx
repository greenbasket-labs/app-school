import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { getOperationalSummary } from "@/domain/reports/operational-summary";
import { db } from "@/lib/db";
import WorkspaceNav from "../workspace-nav";

export default async function DashboardPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: {
      school: { select: { name: true } },
      isOwner: true,
      capabilities: { select: { capability: { select: { code: true } } } },
    },
  });
  if (!membership) redirect("/app");

  const capabilitySet = new Set(membership.capabilities.map(({ capability }) => capability.code));
  const canViewStudents = capabilitySet.has(CAPABILITIES.VIEW_STUDENTS);
  const canViewAttendance = capabilitySet.has(CAPABILITIES.VIEW_ATTENDANCE);
  const canManageFinance = capabilitySet.has(CAPABILITIES.MANAGE_FINANCE);
  const canManageSchool = capabilitySet.has(CAPABILITIES.MANAGE_SCHOOL);
  const canCreateAssessment = capabilitySet.has(CAPABILITIES.CREATE_ASSESSMENT);
  const summary = await getOperationalSummary(schoolId);
  const canSeeSchoolSummary = membership.isOwner || canManageSchool || canViewStudents || canViewAttendance || canManageFinance || canCreateAssessment;

  return (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Link href={`/app/schools/${schoolId}`} style={{ color: "#53615a" }}>← School workspace</Link>
        <WorkspaceNav schoolId={schoolId} />

        <section style={{ marginTop: 28 }}>
          <p style={{ margin: 0, color: "#53615a", fontSize: 13, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>School dashboard</p>
          <h1 style={{ margin: "8px 0 6px", fontSize: 38 }}>{membership.school.name}</h1>
          <p style={{ margin: 0, color: "#53615a", lineHeight: 1.6 }}>
            {membership.isOwner ? "Manage the school and keep its operational picture in one place." : "Your school workspace and available actions."}
          </p>
        </section>

        {canSeeSchoolSummary ? (
          <>
            <section aria-label="School metrics" style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {canViewStudents && <MetricCard label="Students" value={summary.activeStudents} />}
              {(membership.isOwner || canManageSchool) && <MetricCard label="Teachers & staff" value={summary.activeStaff} />}
              {canViewAttendance && <MetricCard label="Attendance today" value={summary.attendanceRecordedToday} />}
              {canManageFinance && <MetricCard label="Outstanding" value={`₦${summary.outstandingAmount}`} />}
            </section>

            <section style={{ marginTop: 28 }}>
              <h2 style={{ marginBottom: 12 }}>Today at a glance</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                {canViewAttendance && <div style={infoCard}><strong>Attendance</strong><p style={sub}>{summary.attendanceRecordedToday} attendance records have been recorded today.</p></div>}
                {canManageFinance && <div style={infoCard}><strong>Fees</strong><p style={sub}>{summary.openInvoices} open invoices currently have an outstanding balance.</p></div>}
                <div style={infoCard}><strong>Access</strong><p style={sub}>This dashboard only shows data inside your active school membership.</p></div>
              </div>
            </section>
          </>
        ) : (
          <section style={{ marginTop: 28, ...infoCard }}>
            <h2 style={{ marginTop: 0 }}>Your workspace</h2>
            <p style={sub}>Your account is connected to this school, but no dashboard data capability has been assigned yet.</p>
          </section>
        )}

        <section style={{ marginTop: 28 }}>
          <h2 style={{ marginBottom: 12 }}>Quick actions</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {canViewStudents && <Link href={`/app/schools/${schoolId}/students`} style={actionCard}>Students →<span style={sub}>View and manage the school roster.</span></Link>}
            {canViewAttendance && <Link href={`/app/schools/${schoolId}/attendance`} style={actionCard}>Attendance →<span style={sub}>Record or review attendance.</span></Link>}
            {canCreateAssessment && <Link href={`/app/schools/${schoolId}/assessments`} style={actionCard}>Assessments & Results →<span style={sub}>Capture and manage academic results.</span></Link>}
            {canManageFinance && <Link href={`/app/schools/${schoolId}/finance`} style={actionCard}>Fees & Finance →<span style={sub}>Review fees and financial activity.</span></Link>}
            {canManageSchool && <Link href={`/app/schools/${schoolId}/settings`} style={actionCard}>School Settings →<span style={sub}>Configure school controls and modules.</span></Link>}
            <Link href={`/app/schools/${schoolId}/reports`} style={actionCard}>Reports →<span style={sub}>Open detailed operational reports when enabled.</span></Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ border: "1px solid #e0e6e2", borderRadius: 14, padding: 18, background: "white" }}>
      <strong>{label}</strong>
      <div style={{ fontSize: 28, marginTop: 8 }}>{value}</div>
    </div>
  );
}

const infoCard = { border: "1px solid #e0e6e2", borderRadius: 14, padding: 18, background: "white" };
const actionCard = { display: "block", padding: 18, borderRadius: 14, background: "#f3f7f4", color: "inherit", textDecoration: "none", fontWeight: 700 };
const sub = { margin: "6px 0 0", color: "#53615a", fontWeight: 400, lineHeight: 1.5 };
