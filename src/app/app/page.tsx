import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";

export default async function AppHomePage() {
  const session = await currentSession();
  if (!session) redirect("/login");

  const memberships = await db.membership.findMany({
    where: { userId: session.user.id, status: "ACTIVE" },
    select: {
      schoolId: true,
      school: { select: { id: true, name: true, status: true, setupStatus: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 1) {
    redirect(`/app/schools/${memberships[0].schoolId}/dashboard`);
  }

  return (
    <main style={{ minHeight: "100vh", padding: 32, background: "#f6f8f6" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "start", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>SkulGo</p>
            <h1 style={{ margin: "10px 0 6px", fontSize: 36 }}>Choose your school</h1>
            <p style={{ margin: 0, color: "#53615a" }}>{session.user.email}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ccd6d0", background: "white", cursor: "pointer" }}>Sign out</button>
          </form>
        </header>

        {memberships.length === 0 ? (
          <section style={{ marginTop: 32, background: "white", borderRadius: 18, padding: 28, boxShadow: "0 8px 24px rgba(0,0,0,.05)" }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>No school connection yet</h2>
            <p style={{ color: "#53615a", lineHeight: 1.6 }}>
              This account does not have an active school membership yet. School discovery, admission applications and staff applications will create the connection before a school workspace becomes available.
            </p>
            <Link href="/" style={{ display: "inline-block", marginTop: 12, color: "#173d2a", fontWeight: 700 }}>Return to SkulGo home</Link>
          </section>
        ) : (
          <section style={{ marginTop: 32, display: "grid", gap: 16 }}>
            <p style={{ margin: 0, color: "#53615a" }}>This selector appears only because your account has more than one active school membership.</p>
            {memberships.map(({ school }) => (
              <Link key={school.id} href={`/app/schools/${school.id}/dashboard`} style={{ display: "block", background: "white", borderRadius: 16, padding: 24, color: "inherit", textDecoration: "none", boxShadow: "0 8px 24px rgba(0,0,0,.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 22 }}>{school.name}</h2>
                    <p style={{ margin: "8px 0 0", color: "#53615a" }}>Setup: {school.setupStatus.replaceAll("_", " ").toLowerCase()}</p>
                  </div>
                  <span style={{ fontWeight: 700 }}>{school.status}</span>
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
