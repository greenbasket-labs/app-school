import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";

export default async function ParentSchoolPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;

  const school = await db.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true },
  });
  if (!school) redirect("/app");

  const linkedChildren = await db.studentGuardian.findMany({
    where: { schoolId, guardian: { userId: session.user.id } },
    select: {
      relationship: true,
      isPrimary: true,
      student: {
        select: {
          id: true,
          admissionNumber: true,
          firstName: true,
          middleName: true,
          lastName: true,
          status: true,
          enrollments: {
            where: { status: "ACTIVE" },
            orderBy: { enrolledAt: "desc" },
            take: 1,
            select: {
              classArm: { select: { name: true, classLevel: { select: { name: true } } } },
              academicSession: { select: { name: true, status: true } },
            },
          },
        },
      },
    },
    orderBy: [{ isPrimary: "desc" }, { student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
  });

  return (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Link href="/app/parent" style={{ color: "#53615a" }}>← Parent workspace</Link>
        <section style={{ marginTop: 24 }}>
          <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>SkulGo parent</p>
          <h1 style={{ margin: "10px 0 6px", fontSize: 36 }}>{school.name}</h1>
          <p style={{ margin: 0, color: "#53615a", lineHeight: 1.6 }}>
            Only children linked to your verified guardian account are shown here.
          </p>
        </section>

        {linkedChildren.length === 0 ? (
          <section style={{ marginTop: 28, background: "white", borderRadius: 16, padding: 24 }}>
            <h2 style={{ marginTop: 0 }}>No linked children</h2>
            <p style={{ color: "#53615a", lineHeight: 1.6 }}>
              The school has not linked a student to this guardian account at this school.
            </p>
          </section>
        ) : (
          <section style={{ marginTop: 28, display: "grid", gap: 14 }} aria-label="Linked children">
            {linkedChildren.map(({ student, relationship }) => {
              const enrollment = student.enrollments[0];
              const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
              const classLabel = enrollment
                ? `${enrollment.classArm.classLevel.name} ${enrollment.classArm.name}`
                : "No active enrollment";

              return (
                <article key={student.id} style={{ background: "white", borderRadius: 16, padding: 22, boxShadow: "0 8px 24px rgba(0,0,0,.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 22 }}>{fullName}</h2>
                      <p style={{ margin: "7px 0 0", color: "#53615a" }}>
                        Admission no. {student.admissionNumber}{relationship ? ` · ${relationship}` : ""}
                      </p>
                    </div>
                    <span style={{ fontWeight: 700 }}>{student.status}</span>
                  </div>

                  <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                    <div style={infoCard}><strong>Class</strong><div style={value}>{classLabel}</div></div>
                    <div style={infoCard}><strong>Session</strong><div style={value}>{enrollment?.academicSession.name ?? "Not enrolled"}</div></div>
                  </div>

                  <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link href={`/app/schools/${schoolId}/parent/children/${student.id}`} style={actionCard}>Open child workspace →</Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

const infoCard = { border: "1px solid #e0e6e2", borderRadius: 12, padding: 14, background: "#f8faf9" };
const value = { marginTop: 6, color: "#31443a" };
const actionCard = { display: "inline-block", padding: "10px 14px", borderRadius: 10, background: "#173d2a", color: "white", textDecoration: "none", fontWeight: 700 };
