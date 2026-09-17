import Link from "next/link";

export default function PersonalAccountRegisterPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section style={{ width: "100%", maxWidth: 520, background: "white", borderRadius: 20, padding: 32, boxShadow: "0 12px 40px rgba(0,0,0,.08)" }}>
        <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>SkulGo</p>
        <h1 style={{ margin: "12px 0 8px", fontSize: 32 }}>Personal accounts are coming into the identity flow.</h1>
        <p style={{ color: "#53615a", lineHeight: 1.6 }}>
          SkulGo uses one personal account for students, teachers, staff and guardians. School connections are established through school applications, offers, admissions or verified guardian relationships.
        </p>
        <div style={{ marginTop: 24, padding: 18, borderRadius: 14, background: "#f3f7f4" }}>
          <strong>Current safe path</strong>
          <p style={{ margin: "8px 0 0", color: "#53615a", lineHeight: 1.5 }}>
            School owners can register a school now. Personal-account creation will be enabled together with the server-side identity and school-joining model so an account can never be created into a half-defined relationship.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
          <Link href="/login" style={{ padding: "12px 18px", borderRadius: 10, background: "#173d2a", color: "white", textDecoration: "none", fontWeight: 700 }}>Sign in</Link>
          <Link href="/register" style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid #ccd6d0", color: "#173d2a", textDecoration: "none", fontWeight: 700 }}>Register a school</Link>
        </div>
      </section>
    </main>
  );
}
