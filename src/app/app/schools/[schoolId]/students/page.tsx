import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";
import StudentWorkspace from "./workspace";

export default async function StudentsPage({ params }: { params: Promise<{ schoolId: string }> }) {
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
  if (!capabilities.has(CAPABILITIES.VIEW_STUDENTS)) redirect(`/app/schools/${schoolId}`);

  const [students, sessions] = await Promise.all([
    db.student.findMany({
      where: { schoolId },
      select: { id: true, admissionNumber: true, firstName: true, middleName: true, lastName: true, status: true, enrollments: { select: { id: true, status: true, academicSession: { select: { id: true, name: true } }, classArm: { select: { id: true, name: true, classLevel: { select: { name: true } } } } }, orderBy: { enrolledAt: "desc" } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.academicSession.findMany({ where: { schoolId }, select: { id: true, name: true, status: true, classArms: { select: { id: true, name: true, classLevel: { select: { name: true } } }, orderBy: [{ classLevel: { order: "asc" } }, { name: "asc" }] } }, orderBy: { startsAt: "desc" } }),
  ]);

  return (
    <main style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Link href={`/app/schools/${schoolId}`} style={{ color: "#53615a" }}>← School workspace</Link>
        <div style={{ marginTop: 20 }}>
          <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>Students</p>
          <h1 style={{ margin: "8px 0 6px", fontSize: 34 }}>{membership.school.name}</h1>
          <p style={{ margin: 0, color: "#53615a" }}>One student record. Enrollment connects that student to a session and class.</p>
        </div>
        <StudentWorkspace schoolId={schoolId} canManage={capabilities.has(CAPABILITIES.MANAGE_STUDENTS)} initialStudents={students} sessions={sessions} />
      </div>
    </main>
  );
}
