import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section style={{ width: "100%", maxWidth: 720, background: "white", borderRadius: 20, padding: 40, boxShadow: "0 12px 40px rgba(0,0,0,.08)" }}>
        <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>Green Basket School</p>
        <h1 style={{ fontSize: 42, lineHeight: 1.05, margin: "16px 0" }}>Keep the school’s truth in one place.</h1>
        <p style={{ fontSize: 18, lineHeight: 1.6, color: "#53615a", maxWidth: 600 }}>
          A school operations platform built around trustworthy records, clear responsibility, and less repeated work.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          <Link href="/login" style={{ padding: "12px 18px", borderRadius: 10, background: "#173d2a", color: "white", textDecoration: "none", fontWeight: 700 }}>Sign in</Link>
          <Link href="/register" style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid #ccd6d0", color: "#173d2a", textDecoration: "none", fontWeight: 700 }}>Register a school</Link>
        </div>
      </section>
    </main>
  );
}
