import Link from "next/link";
import BackendMenu from "@/modules/backend-toggle/backend-menu";
import { SKULGO_MVP_MODULES } from "@/modules";

export default function SkulgoMvpPage() {
  return (
    <main style={{ minHeight: "100vh", padding: 24, background: "#f6f8f7" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 24 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "#2d6548" }}>SkulGo MVP</p>
            <h1 style={{ margin: "8px 0 4px", fontSize: 34 }}>Transparent & Secure Records.</h1>
            <p style={{ margin: 0, color: "#66736c" }}>Lean school operations that still work when the internet does not.</p>
          </div>
          <Link href="/login" style={{ color: "#173d2a", fontWeight: 700 }}>Sign in</Link>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
          {SKULGO_MVP_MODULES.map((module) => (
            <Link key={module.key} href={module.href} style={{ textDecoration: "none", color: "inherit", background: "white", border: "1px solid #dfe7e2", borderRadius: 14, padding: 18 }}>
              <strong>{module.label}</strong>
              <p style={{ margin: "8px 0 0", color: "#66736c", fontSize: 14 }}>Open the existing workflow.</p>
            </Link>
          ))}
        </section>

        <aside style={{ background: "white", border: "1px solid #dfe7e2", borderRadius: 14, padding: 18, marginTop: 16 }}>
          <BackendMenu />
        </aside>

        <p style={{ fontSize: 12, color: "#7b8780", marginTop: 18 }}>
          Offline changes are stored locally first and synchronized when connectivity returns. Server authorization remains authoritative.
        </p>
      </div>
    </main>
  );
}
