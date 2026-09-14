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

  return (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "start", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>School workspace</p>
            <h1 style={{ margin: "10px 0 6px", fontSize: 36 }}>Your schools</h1>
            <p style={{ margin: 0, color: "#53615a" }}>{session.user.email}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ccd6d0", background: "white", cursor: "pointer" }}>Sign out</button>
          </form>
        </header>

        <section style={{ marginTop: 32, display: "grid", gap: 16 }}>
          {memberships.length === 0 ? (
            <div style={{ background: "white", borderRadius: 16, padding: 24 }}>No active school membership is available for this account.</div>
          ) : memberships.map(({ school }) => (
            <Link key={school.id} href={`/app/schools/${school.id}`} style={{ display: "block", background: "white", borderRadius: 16, padding: 24, color: "inherit", textDecoration: "none", boxShadow: "0 8px 24px rgba(0,0,0,.05)" }}>
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
      </div>
    </main>
  );
}
