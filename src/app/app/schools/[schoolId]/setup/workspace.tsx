"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Term = { id: string; name: string; order: number; startsAt: string; endsAt: string };
type Session = { id: string; name: string; startsAt: string; endsAt: string; status: string; terms: Term[] };
type Arm = { id: string; name: string; classLevel: { id: string; name: string; order: number } };
type Level = { id: string; name: string; order: number; arms: { id: string; name: string }[] };
type Subject = { id: string; name: string; code: string | null };
type Readiness = { ready: boolean; completed: number; total: number; checks: { key: string; label: string; complete: boolean; detail: string }[] };

export default function SetupWorkspace({ schoolId, schoolName, setupStatus }: { schoolId: string; schoolName: string; setupStatus: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [s, l, sub, r] = await Promise.all([
      fetch(`/api/schools/${schoolId}/academic-sessions`),
      fetch(`/api/schools/${schoolId}/class-levels`),
      fetch(`/api/schools/${schoolId}/subjects`),
      fetch(`/api/schools/${schoolId}/setup/readiness`),
    ]);
    const [sj, lj, subj, rj] = await Promise.all([s.json(), l.json(), sub.json(), r.json()]);
    if (!s.ok || !l.ok || !sub.ok) throw new Error("Could not load school setup.");
    setSessions(sj.sessions ?? []); setLevels(lj.classLevels ?? []); setSubjects(subj.subjects ?? []);
    if (r.ok) setReadiness(rj.readiness ?? null);
  }

  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : "Could not load school setup.")); }, [schoolId]);
  const arms = useMemo(() => levels.flatMap((level) => level.arms.map((arm) => ({ ...arm, classLevel: level }))), [levels]);

  async function submit(path: string, payload: unknown, success: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "Request failed.");
      setMessage(success); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Request failed."); }
    finally { setBusy(false); }
  }

  function createSession(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); return submit(`/api/schools/${schoolId}/academic-sessions`, { name: f.get("name"), startsAt: f.get("startsAt"), endsAt: f.get("endsAt") }, "Academic session created."); }
  function createTerm(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); return submit(`/api/schools/${schoolId}/academic-sessions/${f.get("sessionId")}/terms`, { name: f.get("name"), order: Number(f.get("order")), startsAt: f.get("startsAt"), endsAt: f.get("endsAt") }, "Academic term created."); }
  function createLevel(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); return submit(`/api/schools/${schoolId}/class-levels`, { name: f.get("name"), order: Number(f.get("order")) }, "Class level created."); }
  function createArm(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); return submit(`/api/schools/${schoolId}/class-levels/${f.get("classLevelId")}/arms`, { name: f.get("name") }, "Class arm created."); }
  function createSubject(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); return submit(`/api/schools/${schoolId}/subjects`, { name: f.get("name"), code: f.get("code") || null }, "Subject created."); }
  function assign(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); return submit(`/api/schools/${schoolId}/class-subjects`, { academicSessionId: f.get("sessionId"), classArmId: f.get("classArmId"), subjectId: f.get("subjectId") }, "Subject assigned to class."); }

  const field = { display: "grid", gap: 6, marginBottom: 10 };
  const input = { padding: 10, border: "1px solid #d8e0db", borderRadius: 9 };
  const button = { padding: "10px 14px", border: 0, borderRadius: 9, cursor: "pointer", fontWeight: 700 };
  const card = { border: "1px solid #e0e6e2", borderRadius: 14, padding: 18 };

  return <main style={{ minHeight: "100vh", padding: 24 }}><div style={{ maxWidth: 1050, margin: "0 auto" }}>
    <a href={`/app/schools/${schoolId}`} style={{ color: "#53615a" }}>← School workspace</a>
    <h1 style={{ margin: "18px 0 6px", fontSize: 34 }}>Set up your school</h1>
<p style={{ color: "#53615a", lineHeight: 1.6 }}>Configure your school structure once. These records become the foundation for students, attendance, results and other operations.</p>
    <div style={{ padding: 14, background: "#f3f7f4", borderRadius: 12, margin: "18px 0" }}><strong>Setup status:</strong> {setupStatus.replaceAll("_", " ").toLowerCase()}</div>

    {readiness && <section style={{ ...card, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div><h2 style={{ margin: 0 }}>Setup readiness</h2><p style={{ margin: "5px 0 0", color: "#53615a" }}>{readiness.completed} of {readiness.total} foundation checks complete.</p></div>
        <strong>{readiness.ready ? "READY" : "NOT READY"}</strong>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 14 }}>{readiness.checks.map((check) => <div key={check.key} style={{ padding: 10, borderRadius: 9, background: check.complete ? "#eef8f0" : "#fff5df" }}><strong>{check.complete ? "✓" : "○"} {check.label}</strong><div style={{ color: "#53615a", marginTop: 3 }}>{check.detail}</div></div>)}</div>
    </section>}

    {message && <div style={{ padding: 12, background: "#eef8f0", borderRadius: 10, marginBottom: 12 }}>{message}</div>}
    {error && <div style={{ padding: 12, background: "#fff1f1", borderRadius: 10, marginBottom: 12 }}>{error}</div>}

    <section style={{ display: "grid", gap: 14 }}>
      <div style={card}><h2>1. Academic session</h2><form onSubmit={createSession}><label style={field}>Name<input name="name" placeholder="2026/2027" required style={input} /></label><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><label style={field}>Starts<input name="startsAt" type="date" required style={input} /></label><label style={field}>Ends<input name="endsAt" type="date" required style={input} /></label></div><button disabled={busy} style={button}>Create session</button></form><ul>{sessions.map((s) => <li key={s.id}>{s.name} — {s.status}</li>)}</ul></div>
      <div style={card}><h2>2. Academic terms</h2><form onSubmit={createTerm}><label style={field}>Academic session<select name="sessionId" required style={input}>{sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label style={field}>Term name<input name="name" placeholder="First Term" required style={input} /></label><label style={field}>Order<input name="order" type="number" min="1" max="12" placeholder="1" required style={input} /></label><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><label style={field}>Starts<input name="startsAt" type="date" required style={input} /></label><label style={field}>Ends<input name="endsAt" type="date" required style={input} /></label></div><button disabled={busy || sessions.length === 0} style={button}>Create term</button></form>{sessions.map((s) => <div key={s.id}><strong>{s.name}</strong><ul>{s.terms.map((t) => <li key={t.id}>{t.order}. {t.name}</li>)}</ul></div>)}</div>
      <div style={card}><h2>3. Class levels</h2><form onSubmit={createLevel}><label style={field}>Name<input name="name" placeholder="JSS 1" required style={input} /></label><label style={field}>Order<input name="order" type="number" min="1" required style={input} /></label><button disabled={busy} style={button}>Create class level</button></form><ul>{levels.map((l) => <li key={l.id}>{l.name} — {l.arms.length} arm(s)</li>)}</ul></div>
      <div style={card}><h2>4. Class arms</h2><form onSubmit={createArm}><label style={field}>Class level<select name="classLevelId" required style={input}>{levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label style={field}>Arm name<input name="name" placeholder="A" required style={input} /></label><button disabled={busy || levels.length === 0} style={button}>Create arm</button></form><ul>{arms.map((a) => <li key={a.id}>{a.classLevel.name} {a.name}</li>)}</ul></div>
      <div style={card}><h2>5. Subjects</h2><form onSubmit={createSubject}><label style={field}>Subject name<input name="name" placeholder="Mathematics" required style={input} /></label><label style={field}>Code (optional)<input name="code" placeholder="MTH" style={input} /></label><button disabled={busy} style={button}>Create subject</button></form><ul>{subjects.map((s) => <li key={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</li>)}</ul></div>
      <div style={card}><h2>6. Assign subjects to classes</h2><form onSubmit={assign}><label style={field}>Academic session<select name="sessionId" required style={input}>{sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label style={field}>Class arm<select name="classArmId" required style={input}>{arms.map((a) => <option key={a.id} value={a.id}>{a.classLevel.name} {a.name}</option>)}</select></label><label style={field}>Subject<select name="subjectId" required style={input}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><button disabled={busy || sessions.length === 0 || arms.length === 0 || subjects.length === 0} style={button}>Assign subject</button></form></div>
    </section>
  </div></main>;
}
