"use client";
import { useEffect, useState } from "react";

export default function AuditWorkspace({ schoolId }: { schoolId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => {
    fetch(`/api/schools/${schoolId}/finance/audit`, { cache: "no-store" })
      .then((r) => r.json()).then((j) => setEvents(j.events ?? []));
  }, [schoolId]);
  if (!events.length) return <p>No finance history recorded yet.</p>;
  return <div style={{ display: "grid", gap: 8, marginTop: 20 }}>{events.map((e) => (
    <article key={e.id} style={{ padding: 14, border: "1px solid #e1e6e3", borderRadius: 10 }}>
      <strong>{e.action.replace("finance.", "").replaceAll("_", " ")}</strong>
      <div style={{ color: "#53615a", marginTop: 4 }}>{new Date(e.occurredAt).toLocaleString()} · {e.actorName ?? "System"}</div>
      <div style={{ marginTop: 8, fontSize: 13 }}>Entity: {e.entityType}{e.entityId ? ` · ${e.entityId}` : ""}</div>
    </article>
  ))}</div>;
}
