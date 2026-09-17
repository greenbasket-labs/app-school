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
    redirect(`/app/schools/${memberships[0].schoolId}`);
  }

  return (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "start", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>SkulGo account</p>
            <h1 style={{ margin: "10px 0 6px", fontSize: 36 }}>
              {memberships.length === 0 ? "Welcome to SkulGo" : "Choose your school"}
            </h1>
            <p style={{ margin: 0, color: "#53615a" }}>{session.user.email}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ccd6d0", background: "white", cursor: "pointer" }}>Sign out</button>
          </form>
        </header>

        {memberships.length === 0 ? (
          <section style={{ marginTop: 32, display: "grid", gap: 16 }}>
            <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 8px 24px rgba(0,0,0,.05)" }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>Your personal account is ready</h2>
              <p style={{ margin: "10px 0 0", color: "#53615a", lineHeight: 1.6 }}>
                Find your school and request the relationship you need. A school owner approves the relationship before school access is activated.
              </p>
              <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link href="/app/schools/join" style={primaryLink}>Find a school →</Link>
                <Link href="/register" style={secondaryLink}>Register a school →</Link>
              </div>
            </div>
          </section>
        ) : (
          <section style={{ marginTop: 32, display: "grid", gap: 16 }}>
            <p style={{ margin: 0, color: "#53615a" }}>Select the school workspace you want to open.</p>
            {memberships.map(({ school }) => (
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
        )}
      </div>
    </main>
  );
}

const primaryLink = { display: "inline-block", padding: "12px 16px", borderRadius: 10, background: "#173d2a", color: "white", textDecoration: "none", fontWeight: 700 };
const secondaryLink = { display: "inline-block", padding: "12px 16px", borderRadius: 10, border: "1px solid #ccd6d0", background: "white", color: "inherit", textDecoration: "none", fontWeight: 700 };
