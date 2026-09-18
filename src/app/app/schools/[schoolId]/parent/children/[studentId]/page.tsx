import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";

export default async function ParentChildPage({ params }: { params: Promise<{ schoolId: string; studentId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId, studentId } = await params;

  const student = await db.student.findFirst({
    where: {
      id: studentId,
      schoolId,
      studentGuardians: { some: { schoolId, guardian: { userId: session.user.id } } },
    },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      admissionNumber: true,
      status: true,
      school: { select: { name: true } },
      enrollments: {
        where: { status: "ACTIVE" },
        orderBy: { enrolledAt: "desc" },
        take: 1,
        select: {
          classArm: { select: { name: true, classLevel: { select: { name: true } } } },
          academicSession: { select: { name: true } },
        },
      },
    },
  });
  if (!student) redirect(`/app/schools/${schoolId}/parent`);

  return (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Link href={`/app/schools/${schoolId}/parent`} style={{ color: "#53615a" }}>← Parent workspace</Link>
        <section style={{ marginTop: 24 }}>
          <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>Student overview</p>
          <h1 style={{ margin: "10px 0 6px", fontSize: 36 }}>
            {[student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ")}
          </h1>
          <p style={{ margin: 0, color: "#53615a" }}>{student.school.name}</p>
        </section>

        <section style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <div style={card}><strong>Admission number</strong><div style={value}>{student.admissionNumber}</div></div>
          <div style={card}><strong>Status</strong><div style={value}>{student.status}</div></div>
          <div style={card}><strong>Class</strong><div style={value}>{student.enrollments[0] ? `${student.enrollments[0].classArm.classLevel.name} ${student.enrollments[0].classArm.name}` : "Not enrolled"}</div></div>
          <div style={card}><strong>Academic session</strong><div style={value}>{student.enrollments[0]?.academicSession.name ?? "Not enrolled"}</div></div>
        </section>

        <section style={{ marginTop: 28, background: "white", borderRadius: 16, padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>Parent information access</h2>
          <p style={{ color: "#53615a", lineHeight: 1.6, marginBottom: 0 }}>
            This page is limited to the student relationship attached to your verified guardian account. Published results, attendance history and other parent-facing records can be added here without widening the authorization boundary.
          </p>
        </section>
      </div>
    </main>
  );
}

const card = { border: "1px solid #e0e6e2", borderRadius: 14, padding: 18, background: "white" };
const value = { marginTop: 7, fontSize: 20, color: "#31443a" };
