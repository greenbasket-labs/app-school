import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { getSchoolModules } from "@/domain/modules/service";
import { db } from "@/lib/db";

export default async function SchoolWorkspacePage({ params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: {
      id: true,
      isOwner: true,
      school: { select: { id: true, name: true, status: true, setupStatus: true } },
      capabilities: { select: { capability: { select: { code: true } } } },
    },
  });
  if (!membership) redirect("/app");

  const capabilitySet = new Set(membership.capabilities.map(({ capability }) => capability.code));
  const canManageSchool = capabilitySet.has(CAPABILITIES.MANAGE_SCHOOL);
  const canViewAttendance = capabilitySet.has(CAPABILITIES.VIEW_ATTENDANCE);
  const canViewStudents = capabilitySet.has(CAPABILITIES.VIEW_STUDENTS);
  const canViewAssessments = capabilitySet.has(CAPABILITIES.CREATE_ASSESSMENT);
  const canManageFinance = capabilitySet.has(CAPABILITIES.MANAGE_FINANCE);
  const canSendCommunication = capabilitySet.has(CAPABILITIES.SEND_COMMUNICATION);

  const modules = await getSchoolModules(schoolId);
  const enabledModules = new Set(modules.filter((module) => module.enabled).map((module) => module.code));

  const showAcademics = enabledModules.has("ACADEMICS") && canManageSchool;
  const showStudents = enabledModules.has("STUDENTS") && canViewStudents;
  const showAttendance = enabledModules.has("ATTENDANCE") && canViewAttendance;
  const showAssessments = enabledModules.has("ASSESSMENTS") && canViewAssessments;
  const showFinance = enabledModules.has("FINANCE") && (canManageFinance || capabilitySet.has(CAPABILITIES.VIEW_FINANCE));
  const showCommunication = enabledModules.has("COMMUNICATION") && (canViewStudents || canSendCommunication);
  const showReports = enabledModules.has("REPORTS") && canViewAttendance;

  return (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Link href="/app" style={{ color: "#53615a" }}>← All schools</Link>
        <div style={{ marginTop: 24 }}>
          <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13, color: "#53615a" }}>School workspace</p>
          <h1 style={{ margin: "8px 0 6px", fontSize: 38 }}>{membership.school.name}</h1>
          <p style={{ margin: 0, color: "#53615a", lineHeight: 1.6 }}>Your school workspace opens on the dashboard. Everything else stays inside the same school boundary.</p>
        </div>

        <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <Link href={`/app/schools/${schoolId}/dashboard`} style={featureCard}><strong>Dashboard →</strong><p style={sub}>See the current operating picture and your available actions.</p></Link>
          {canManageSchool && membership.school.setupStatus !== "COMPLETED" && <Link href={`/app/schools/${schoolId}/setup`} style={featureCard}><strong>School setup →</strong><p style={sub}>Configure sessions, classes, arms, subjects and assignments.</p></Link>}
          {membership.isOwner && <Link href={`/app/schools/${schoolId}/settings`} style={featureCard}><strong>Settings & modules →</strong><p style={sub}>Control school configuration and enabled product modules.</p></Link>}
        </div>

        <section style={{ marginTop: 32 }}>
          <h2 style={{ marginBottom: 12 }}>Your school tools</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {showAcademics && <Link href={`/app/schools/${schoolId}/setup`} style={toolCard}>Academics →<span style={sub}>Sessions, terms, classes, arms and subjects.</span></Link>}
            {showStudents && <Link href={`/app/schools/${schoolId}/students`} style={toolCard}>Students →<span style={sub}>School roster and enrollment workflows.</span></Link>}
            {showAttendance && <Link href={`/app/schools/${schoolId}/attendance`} style={toolCard}>Daily attendance →<span style={sub}>Record and review attendance.</span></Link>}
            {showAssessments && <Link href={`/app/schools/${schoolId}/assessments`} style={toolCard}>Assessments & Results →<span style={sub}>Capture and manage academic results.</span></Link>}
            {showFinance && <Link href={`/app/schools/${schoolId}/finance`} style={toolCard}>Fees & Finance →<span style={sub}>Review fees, invoices and payments.</span></Link>}
            {showCommunication && <Link href={`/app/schools/${schoolId}/communication`} style={toolCard}>Communication →<span style={sub}>Open notifications and school communication.</span></Link>}
            {showReports && <Link href={`/app/schools/${schoolId}/reports`} style={toolCard}>Reports →<span style={sub}>Open detailed operational reports.</span></Link>}
          </div>
        </section>
      </div>
    </main>
  );
}

const featureCard = { display: "block", padding: 20, borderRadius: 16, background: "white", border: "1px solid #e0e6e2", color: "inherit", textDecoration: "none" };
const toolCard = { display: "block", padding: 18, borderRadius: 14, background: "#f3f7f4", color: "inherit", textDecoration: "none", fontWeight: 700 };
const sub = { margin: "6px 0 0", color: "#53615a", fontWeight: 400, lineHeight: 1.5 };
