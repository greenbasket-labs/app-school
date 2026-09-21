import Link from "next/link";
import { CAPABILITIES } from "@/domain/auth/capabilities";

export default async function TeacherWorkspacePage({ schoolId, schoolName, capabilities, enabledModules, assignments }: {
  schoolId: string;
  schoolName: string;
  capabilities: Set<string>;
  enabledModules: Set<string>;
  assignments: Array<{ id: string; academicSession: { name: string }; academicTerm: { name: string }; classArm: { name: string; classLevel: { name: string } }; subject: { name: string } }>;
}) {
  const has = (code: string) => capabilities.has(code);
  const links = [
    enabledModules.has("STUDENTS") && has(CAPABILITIES.VIEW_STUDENTS) ? ["Students", `/app/schools/${schoolId}/students`, "View the students relevant to your teaching work."] : null,
    enabledModules.has("ATTENDANCE") && has(CAPABILITIES.VIEW_ATTENDANCE) ? ["Attendance", `/app/schools/${schoolId}/attendance`, "Record or review attendance where the school has granted you access."] : null,
    enabledModules.has("ASSESSMENTS") && has(CAPABILITIES.CREATE_ASSESSMENT) ? ["Assessments & Results", `/app/schools/${schoolId}/assessments`, "Open the academic work available to your access level."] : null,
    enabledModules.has("COMMUNICATION") && (has(CAPABILITIES.VIEW_STUDENTS) || has(CAPABILITIES.SEND_COMMUNICATION)) ? ["Communication", `/app/schools/${schoolId}/communication`, "Open school communication available to your access level."] : null,
  ].filter(Boolean) as string[][];

  return (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Link href="/app" style={{ color: "#53615a" }}>← All schools</Link>
        <div style={{ marginTop: 24, background: "white", borderRadius: 20, padding: 32, boxShadow: "0 8px 28px rgba(0,0,0,.05)" }}>
          <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>Teacher workspace</p>
          <h1 style={{ margin: "10px 0 8px", fontSize: 36 }}>{schoolName}</h1>
          <p style={{ color: "#53615a", lineHeight: 1.6 }}>Your teaching workspace is based on your school relationship and the capabilities granted to you by the school.</p>
          <div style={{ marginTop: 28, border: "1px solid #e0e6e2", borderRadius: 14, padding: 18, background: "#f8faf8" }}>
            <strong>Teacher access</strong>
            <div style={{ marginTop: 6, color: "#53615a" }}>Only tools enabled for your current access are shown here.</div>
          </div>
          <section style={{ marginTop: 24 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 20 }}>Teaching assignments</h2>
            {assignments.length ? assignments.map((assignment) => (
              <div key={assignment.id} style={assignmentCard}>
                <strong>{assignment.classArm.classLevel.name} {assignment.classArm.name} · {assignment.subject.name}</strong>
                <p style={sub}>{assignment.academicSession.name} · {assignment.academicTerm.name}</p>
              </div>
            )) : <div style={emptyCard}>No active teaching assignments have been assigned to you yet.</div>}
          </section>
          {links.map(([label, href, description]) => (
            <Link key={href} href={href} style={cardLink}><strong>{label} →</strong><p style={sub}>{description}</p></Link>
          ))}
          {!links.length && <div style={{ marginTop: 16, padding: 20, borderRadius: 14, background: "#f3f7f4" }}>No teaching tools are currently enabled for your account. Ask the school owner to review your access.</div>}
        </div>
      </div>
    </main>
  );
}

const cardLink = { display: "block", marginTop: 16, padding: 20, borderRadius: 14, background: "#f3f7f4", color: "inherit", textDecoration: "none" };
const sub = { margin: "6px 0 0", color: "#53615a" };
const assignmentCard = { marginTop: 10, padding: 16, borderRadius: 12, border: "1px solid #e0e6e2", background: "#fff" };
const emptyCard = { padding: 16, borderRadius: 12, background: "#f3f7f4", color: "#53615a" };
