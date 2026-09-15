import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { getAcademicSummary, AcademicSummaryValidationError } from "@/domain/reports/academic-summary";
import { db } from "@/lib/db";

export default async function AcademicReportPage({ params, searchParams }: { params: Promise<{ schoolId: string }>; searchParams: Promise<{ sessionId?: string; termId?: string; classArmId?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  const query = await searchParams;
  const membership = await db.membership.findFirst({ where: { userId: session.user.id, schoolId, status: "ACTIVE" }, select: { school: { select: { name: true } }, capabilities: { select: { capability: { select: { code: true } } } } } });
  if (!membership) redirect("/app");
  if (!new Set(membership.capabilities.map(({ capability }) => capability.code)).has(CAPABILITIES.VIEW_STUDENTS)) redirect(`/app/schools/${schoolId}`);
  try { await requireSchoolModule(schoolId, "REPORTS"); await requireSchoolModule(schoolId, "ASSESSMENTS"); } catch { redirect(`/app/schools/${schoolId}/settings/modules`); }

  const sessions = await db.academicSession.findMany({ where: { schoolId }, orderBy: { startsAt: "desc" }, select: { id: true, name: true, terms: { orderBy: { order: "asc" }, select: { id: true, name: true } } } });
  const selectedSession = sessions.find((item) => item.id === query.sessionId) ?? sessions[0];
  const selectedTerm = selectedSession?.terms.find((item) => item.id === query.termId) ?? selectedSession?.terms[0];
  const arms = selectedSession ? await db.classArm.findMany({ where: { classLevel: { schoolId }, enrollments: { some: { academicSessionId: selectedSession.id } } }, orderBy: [{ classLevel: { order: "asc" } }, { name: "asc" }], select: { id: true, name: true, classLevel: { select: { name: true } } } }) : [];
  let report = null;
  let error = "";
  if (selectedSession && selectedTerm) {
    try { report = await getAcademicSummary(schoolId, selectedSession.id, selectedTerm.id, query.classArmId); } catch (e) { if (e instanceof AcademicSummaryValidationError) error = e.message; else throw e; }
  }

  return <main style={{ minHeight: "100vh", padding: 24 }}><div style={{ maxWidth: 1100, margin: "0 auto" }}>
    <Link href={`/app/schools/${schoolId}/reports`} style={{ color: "#53615a" }}>← Reports</Link>
    <p style={{ marginTop: 24, marginBottom: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>Academic report</p>
    <h1 style={{ margin: "8px 0" }}>{membership.school.name}</h1>
    <p style={{ color: "#53615a" }}>Review published assessment performance for a session, term and optional class.</p>
    <form method="get" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end", marginTop: 20, padding: 16, border: "1px solid #dce3df", borderRadius: 14 }}>
      <label>Session<select name="sessionId" defaultValue={selectedSession?.id ?? ""} style={inputStyle}>{sessions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Term<select name="termId" defaultValue={selectedTerm?.id ?? ""} style={inputStyle}>{(selectedSession?.terms ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Class<select name="classArmId" defaultValue={query.classArmId ?? ""} style={inputStyle}><option value="">All classes</option>{arms.map((arm) => <option key={arm.id} value={arm.id}>{arm.classLevel.name} {arm.name}</option>)}</select></label>
      <button type="submit" style={buttonStyle}>Run report</button>
    </form>
    {error ? <p role="alert">{error}</p> : null}
    {report ? <>
      <section style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>{[["Students", report.totals.students], ["Published assessments", report.totals.assessmentsPublished], ["Overall %", report.totals.percentage === null ? "—" : `${report.totals.percentage}%`]].map(([label, value]) => <div key={String(label)} style={cardStyle}><strong>{label}</strong><div style={{ marginTop: 7, fontSize: 25, fontWeight: 800 }}>{value}</div></div>)}</section>
      <section style={{ marginTop: 18, border: "1px solid #dce3df", borderRadius: 14, overflow: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Student", "Admission No.", "Assessments", "Scored", "Missing", "Earned / Possible", "%"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead><tbody>{report.students.map((student) => <tr key={student.studentId}><td style={tdStyle}>{student.studentName}</td><td style={tdStyle}>{student.admissionNumber}</td><td style={tdStyle}>{student.assessments}</td><td style={tdStyle}>{student.scored}</td><td style={tdStyle}>{student.missingScores}</td><td style={tdStyle}>{student.earned} / {student.possible}</td><td style={tdStyle}>{student.percentage === null ? "—" : `${student.percentage}%`}</td></tr>)}</tbody></table>{report.students.length === 0 ? <p style={{ padding: 16, color: "#53615a" }}>No published assessment records found for this selection.</p> : null}</section>
      <p style={{ marginTop: 18, color: "#53615a" }}>Only published assessments are included. This report does not rank students or change academic records.</p>
    </> : <p style={{ marginTop: 20, color: "#53615a" }}>Set up a session and term, then publish assessment results to generate this report.</p>}
  </div></main>;
}
const inputStyle: React.CSSProperties = { display: "block", marginTop: 5, padding: "9px 10px", border: "1px solid #ccd5d0", borderRadius: 8, minWidth: 150 };
const buttonStyle: React.CSSProperties = { padding: "10px 15px", border: 0, borderRadius: 9, background: "#183c2a", color: "white", fontWeight: 700 };
const cardStyle: React.CSSProperties = { padding: 15, border: "1px solid #dce3df", borderRadius: 12 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: 12, borderBottom: "1px solid #dce3df", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: 12, borderBottom: "1px solid #edf0ee" };
