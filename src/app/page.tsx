import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", padding: 24, background: "#f6f8f6" }}>
      <section style={{ width: "100%", maxWidth: 920, margin: "0 auto", paddingTop: 72 }}>
        <div style={{ background: "white", borderRadius: 24, padding: 44, boxShadow: "0 12px 40px rgba(0,0,0,.06)" }}>
          <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>SkulGo</p>
          <h1 style={{ fontSize: 48, lineHeight: 1.05, margin: "16px 0" }}>One front door for the school journey.</h1>
          <p style={{ fontSize: 19, lineHeight: 1.6, color: "#53615a", maxWidth: 700 }}>
            Schools create their school space. Students, teachers, staff and guardians use personal accounts and join the schools they are legitimately connected to.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 28 }}>
            <Link href="/register" style={actionCard}>
              <strong>Register a school →</strong>
              <span>For a school owner creating the school organization and first owner account.</span>
            </Link>
            <Link href="/login" style={actionCard}>
              <strong>Sign in →</strong>
              <span>Continue to the school spaces already connected to your account.</span>
            </Link>
          </div>

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #e0e6e2" }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>How joining works</h2>
            <p style={{ margin: "10px 0 0", color: "#53615a", lineHeight: 1.6 }}>
              A student can find a school and apply for admission. A teacher or staff member can apply to join a school. The school reviews the request and only an accepted relationship becomes an active school membership. Guardians are connected through the school’s verified student relationship.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

const actionCard = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
  padding: 20,
  borderRadius: 16,
  background: "#f3f7f4",
  color: "inherit",
  textDecoration: "none",
};
