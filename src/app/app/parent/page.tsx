import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";

export default async function ParentHomePage() {
  const session = await currentSession();
  if (!session) redirect("/login");

  const guardians = await db.$queryRaw<Array<{ schoolId: string; schoolName: string; guardianName: string }>>`
    SELECT g."schoolId", s."name" AS "schoolName", g."fullName" AS "guardianName"
    FROM "Guardian" g
    JOIN "School" s ON s."id" = g."schoolId"
    WHERE g."userId" = ${session.user.id}::uuid
    ORDER BY s."name" ASC
  `;

  if (guardians.length === 0) {
    return (
      <main style={{ minHeight: "100vh", padding: 32 }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Link href="/app" style={{ color: "#53615a" }}>← Workspace</Link>
          <section style={{ marginTop: 24, background: "white", borderRadius: 18, padding: 28 }}>
            <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>SkulGo parent access</p>
            <h1 style={{ margin: "10px 0 8px" }}>No linked school yet</h1>
            <p style={{ color: "#53615a", lineHeight: 1.6 }}>
              This account has not been connected to a guardian record at a school. Parent access is created by the school through a verified student/guardian relationship.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <Link href="/app" style={{ color: "#53615a" }}>← Workspace</Link>
        <section style={{ marginTop: 24 }}>
          <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>SkulGo parent</p>
          <h1 style={{ margin: "10px 0 6px", fontSize: 36 }}>Your children’s school information</h1>
          <p style={{ margin: 0, color: "#53615a", lineHeight: 1.6 }}>
            Access is limited to schools where this account is linked to a verified guardian record.
          </p>
        </section>

        <section style={{ marginTop: 28, display: "grid", gap: 14 }}>
          {guardians.map((guardian) => (
            <Link key={`${guardian.schoolId}:${guardian.guardianName}`} href={`/app/schools/${guardian.schoolId}/parent`} style={{ display: "block", background: "white", borderRadius: 16, padding: 22, color: "inherit", textDecoration: "none", boxShadow: "0 8px 24px rgba(0,0,0,.05)" }}>
              <strong>{guardian.schoolName}</strong>
              <p style={{ margin: "7px 0 0", color: "#53615a" }}>Guardian account: {guardian.guardianName}</p>
              <p style={{ margin: "10px 0 0", fontWeight: 700 }}>Open parent workspace →</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
