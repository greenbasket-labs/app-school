import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";

export default async function SchoolWorkspacePage({ params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  const membership = await db.membership.findFirst({ where: { userId: session.user.id, schoolId, status: "ACTIVE" }, select: { id: true, isOwner: true, school: { select: { id: true, name: true, status: true, setupStatus: true } }, capabilities: { select: { capability: { select: { code: true } } } } } });
  if (!membership) redirect("/app");
  const capabilitySet = new Set(membership.capabilities.map(({ capability }) => capability.code));
  const canManageSchool = capabilitySet.has(CAPABILITIES.MANAGE_SCHOOL);
  const canViewAttendance = capabilitySet.has(CAPABILITIES.VIEW_ATTENDANCE);
  const canViewStudents = capabilitySet.has(CAPABILITIES.VIEW_STUDENTS);
  const canViewAssessments = capabilitySet.has(CAPABILITIES.CREATE_ASSESSMENT);

  return (
    <main style={{ minHeight: "100vh", padding: 32 }}><div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <Link href="/app" style={{ color: "#53615a" }}>← All schools</Link>
      <div style={{ marginTop: 24, background: "white", borderRadius: 20, padding: 32, boxShadow: "0 8px 28px rgba(0,0,0,.05)" }}>
        <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>School workspace</p>
        <h1 style={{ margin: "10px 0 8px", fontSize: 36 }}>{membership.school.name}</h1>
        <p style={{ color: "#53615a", lineHeight: 1.6 }}>School identity and access are established first. Operational workflows sit behind the same school boundary.</p>
        <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div style={{ border: "1px solid #e0e6e2", borderRadius: 12, padding: 16 }}><strong>School status</strong><div style={{ marginTop: 6 }}>{membership.school.status}</div></div>
          <div style={{ border: "1px solid #e0e6e2", borderRadius: 12, padding: 16 }}><strong>Setup status</strong><div style={{ marginTop: 6 }}>{membership.school.setupStatus.replaceAll("_", " ").toLowerCase()}</div></div>
          <div style={{ border: "1px solid #e0e6e2", borderRadius: 12, padding: 16 }}><strong>School management</strong><div style={{ marginTop: 6 }}>{canManageSchool ? "Allowed" : "Not allowed"}</div></div>
        </div>
        {canManageSchool && membership.school.setupStatus !== "COMPLETED" && <Link href={`/app/schools/${schoolId}/setup`} style={cardLink}><strong>School setup →</strong><p style={sub}>Configure academic sessions, classes, arms, subjects and subject assignments.</p></Link>}
        {membership.isOwner && <Link href={`/app/schools/${schoolId}/settings`} style={cardLink}><strong>Settings & modules →</strong><p style={sub}>The school owner controls which product modules are enabled for this school.</p></Link>}
        {canViewStudents && <Link href={`/app/schools/${schoolId}/students`} style={cardLink}><strong>Students →</strong><p style={sub}>Create student records, enroll students into a session/class, and keep the roster connected to attendance.</p></Link>}
        {canViewAttendance && <Link href={`/app/schools/${schoolId}/attendance`} style={cardLink}><strong>Daily attendance →</strong><p style={sub}>Load a class roster, mark attendance quickly, and save the day in one action.</p></Link>}
        {canViewAssessments && <Link href={`/app/schools/${schoolId}/assessments`} style={cardLink}><strong>Assessment definitions →</strong><p style={sub}>Define assessments by session, term, class and subject. Score capture comes later.</p></Link>}
      </div>
    </div></main>
  );
}
const cardLink = { display: "block", marginTop: 16, padding: 20, borderRadius: 14, background: "#f3f7f4", color: "inherit", textDecoration: "none" };
const sub = { margin: "6px 0 0", color: "#53615a" };
