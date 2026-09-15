"use client";

import { useEffect, useState } from "react";

type Session = { id: string; name: string; startsAt: string; endsAt: string; status: "DRAFT" | "ACTIVE" | "CLOSED" };

export default function SessionSettings({ schoolId, canManage }: { schoolId: string; canManage: boolean }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const response = await fetch(`/api/schools/${schoolId}/academic-sessions`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? data.error ?? "Could not load sessions.");
    setSessions(data.sessions ?? []);
  }

  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : "Could not load sessions.")); }, [schoolId]);

  async function changeStatus(session: Session, status: Session["status"]) {
    setBusy(session.id); setError("");
    try {
      const response = await fetch(`/api/schools/${schoolId}/academic-sessions/${session.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? data.error ?? "Could not update session.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update session."); }
    finally { setBusy(""); }
  }

  return <section style={{ marginTop: 24 }}>
    <h2>Academic session lifecycle</h2>
    <p style={{ color: "#53615a", lineHeight: 1.5 }}>Sessions move forward only: draft → active → closed. Only school managers with the school-management capability can change the lifecycle.</p>
    {error && <div role="alert" style={{ padding: 12, borderRadius: 10, background: "#fff1f1", marginBottom: 12 }}>{error}</div>}
    <div style={{ display: "grid", gap: 10 }}>
      {sessions.map((session) => <article key={session.id} style={{ border: "1px solid #e0e6e2", borderRadius: 14, padding: 16, display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
        <div><strong>{session.name}</strong><div style={{ color: "#53615a", marginTop: 4 }}>{new Date(session.startsAt).toLocaleDateString()} – {new Date(session.endsAt).toLocaleDateString()}</div></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 700 }}>{session.status}</span>
          {canManage && session.status === "DRAFT" && <button disabled={busy === session.id} onClick={() => changeStatus(session, "ACTIVE")} style={{ padding: "8px 12px", border: 0, borderRadius: 8, fontWeight: 700 }}>Activate</button>}
          {canManage && session.status === "ACTIVE" && <button disabled={busy === session.id} onClick={() => changeStatus(session, "CLOSED")} style={{ padding: "8px 12px", border: 0, borderRadius: 8, fontWeight: 700 }}>Close</button>}
        </div>
      </article>)}
      {sessions.length === 0 && <div style={{ color: "#53615a" }}>No academic sessions yet.</div>}
    </div>
  </section>;
}
