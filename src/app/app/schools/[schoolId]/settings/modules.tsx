"use client";

import { useEffect, useState } from "react";

type Module = { code: string; name: string; description: string | null; category: string; enabled: boolean };

export default function ModuleSettings({ schoolId, canManage }: { schoolId: string; canManage: boolean }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const response = await fetch(`/api/schools/${schoolId}/settings/modules`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? data.error ?? "Could not load module settings.");
    setModules(data.modules ?? []);
  }

  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : "Could not load module settings.")); }, [schoolId]);

  async function toggle(module: Module) {
    setBusy(module.code); setError("");
    try {
      const response = await fetch(`/api/schools/${schoolId}/settings/modules`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: module.code, enabled: !module.enabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? data.error ?? "Could not update module.");
      setModules(data.modules ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update module."); }
    finally { setBusy(""); }
  }

  return (
    <section style={{ marginTop: 24 }}>
      {!canManage && <div style={{ padding: 14, borderRadius: 12, background: "#fff5df", marginBottom: 14 }}>Only the school owner can enable or disable modules.</div>}
      {error && <div role="alert" style={{ padding: 14, borderRadius: 12, background: "#fff1f1", marginBottom: 14 }}>{error}</div>}
      <div style={{ display: "grid", gap: 12 }}>
        {modules.map((module) => (
          <article key={module.code} style={{ border: "1px solid #e0e6e2", borderRadius: 14, padding: 18, display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em", color: "#6a776f", fontWeight: 700 }}>{module.category}</div>
              <h2 style={{ margin: "5px 0" }}>{module.name}</h2>
              <p style={{ margin: 0, color: "#53615a", lineHeight: 1.5 }}>{module.description}</p>
            </div>
            <button type="button" disabled={!canManage || busy === module.code} onClick={() => toggle(module)} aria-pressed={module.enabled} style={{ minWidth: 110, padding: "10px 14px", border: 0, borderRadius: 10, cursor: canManage ? "pointer" : "not-allowed", fontWeight: 700 }}>
              {busy === module.code ? "Saving…" : module.enabled ? "Enabled" : "Disabled"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
