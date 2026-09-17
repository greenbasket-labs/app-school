import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";
import AttendanceRoster from "./roster";

export default async function AttendancePage({ params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: {
      school: { select: { id: true, name: true } },
      capabilities: { select: { capability: { select: { code: true } } } },
    },
  });
  if (!membership) redirect("/app");
  const capabilities = new Set(membership.capabilities.map(({ capability }) => capability.code));
  if (!capabilities.has(CAPABILITIES.VIEW_ATTENDANCE)) redirect(`/app/schools/${schoolId}`);

  const [sessions, classArms] = await Promise.all([
    db.academicSession.findMany({ where: { schoolId }, select: { id: true, name: true, status: true }, orderBy: { startsAt: "desc" } }),
    db.classArm.findMany({ where: { classLevel: { schoolId } }, select: { id: true, name: true, classLevel: { select: { name: true } } }, orderBy: [{ classLevel: { order: "asc" } }, { name: "asc" }] }),
  ]);
  const activeSession = sessions.find((item) => item.status === "ACTIVE") ?? sessions[0];
  const sessionOptions = sessions.map((item) => ({ ...item, classArms }));

  return (
    <main style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Link href={`/app/schools/${schoolId}`} style={{ color: "#53615a" }}>← School workspace</Link>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>Daily attendance</p>
            <h1 style={{ margin: "8px 0 6px", fontSize: 34 }}>{membership.school.name}</h1>
            <p style={{ margin: 0, color: "#53615a" }}>Load one class, mark the whole roster, and save once.</p>
          </div>
          <Link href={`/app/schools/${schoolId}/attendance/history`} style={{ borderRadius: 10, background: "white", padding: "10px 14px", color: "#173d2c", fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 16px rgba(0,0,0,.05)" }}>Attendance history →</Link>
        </div>
        {activeSession ? (
          <AttendanceRoster schoolId={schoolId} actorUserId={session.user.id} canRecord={capabilities.has(CAPABILITIES.RECORD_ATTENDANCE)} initialSessionId={activeSession.id} sessions={sessionOptions} />
        ) : (
          <div style={{ marginTop: 24, background: "white", borderRadius: 16, padding: 24 }}>Create an academic session and class before recording attendance.</div>
        )}
      </div>
    </main>
  );
}
