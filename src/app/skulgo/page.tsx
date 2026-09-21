import Link from "next/link";

export default function SkulgoPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section style={{ width: "100%", maxWidth: 520, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#173d2a" }}>SkulGo</p>
        <h1 style={{ margin: "14px 0 28px", fontSize: 28 }}>Transparent & Secure Records.</h1>
        <Link
          href="/login"
          style={{
            display: "inline-block",
            padding: "13px 24px",
            borderRadius: 10,
            background: "#173d2a",
            color: "white",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Sign in
        </Link>
      </section>
    </main>
  );
}
