"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Arm = { id: string; name: string; classLevel: { name: string } };
type Session = { id: string; name: string; status: string; classArms: Arm[] };
type RecordRow = { id: string; studentId: string; enrollmentId: string; attendanceDate: string; status: Status; note: string | null; student: { admissionNumber: string; firstName: string; middleName: string | null; lastName: string } };
type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

const statuses: Status[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
const labels: Record<Status, string> = { PRESENT: "Present", ABSENT: "Absent", LATE: "Late", EXCUSED: "Excused" };

export default function AttendanceHistory({ params }: { params: Promise<{ schoolId: string }> }) {
  const [schoolId, setSchoolId] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [classArmId, setClassArmId] = useState("");
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { params.then((value) => setSchoolId(value.schoolId)); }, [params]);
  useEffect(() => {
    if (!schoolId) return;
    fetch(`/api/schools/${schoolId}/setup/readiness`).catch(() => null);
    fetch(`/api/schools/${schoolId}/academic-sessions`).then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json();
      const next = data.sessions ?? [];
      setSessions(next);
      const active = next.find((item: Session) => item.status === "ACTIVE") ?? next[0];
      if (active) { setSessionId(active.id); setClassArmId(active.classArms?.[0]?.id ?? ""); }
      return null;
    }).catch(() => setMessage("Could not load academic sessions."));
  }, [schoolId]);

  const selectedSession = sessions.find((item) => item.id === sessionId);
  const classArms = selectedSession?.classArms ?? [];
  useEffect(() => { if (!classArms.some((item) => item.id === classArmId)) setClassArmId(classArms[0]?.id ?? ""); }, [sessionId, sessions]);

  async function load() {
    if (!schoolId || !sessionId || !classArmId) return;
    setLoading(true); setMessage("");
    try {
      const res = await fetch(`/api/schools/${schoolId}/attendance/history?academicSessionId=${sessionId}&classArmId=${classArmId}&from=${from}&to=${to}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load attendance history.");
      setRecords(data.records ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load attendance history."); }
    finally { setLoading(false); }
  }

  async function correct(record: RecordRow) {
    const next = window.prompt("New status: PRESENT, ABSENT, LATE or EXCUSED", record.status);
    if (!next || !statuses.includes(next as Status)) return;
    const note = window.prompt("Correction note (optional)", record.note ?? "");
    setLoading(true); setMessage("");
    try {
      const res = await fetch(`/api/schools/${schoolId}/attendance?recordId=${record.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next, note: note ?? "" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not correct attendance.");
      setRecords((rows) => rows.map((row) => row.id === record.id ? { ...row, status: data.record.status, note: data.record.note } : row));
      setMessage(data.changed ? "Attendance corrected and audited." : "No change was made.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not correct attendance."); }
    finally { setLoading(false); }
  }

  const grouped = useMemo(() => records.reduce<Record<string, RecordRow[]>>((acc, row) => { const key = row.attendanceDate.slice(0, 10); (acc[key] ??= []).push(row); return acc; }, {}), [records]);

  return <main style={{ minHeight: "100vh", padding: 24 }}><div style={{ maxWidth: 1000, margin: "0 auto" }}>
    <Link href={`/app/schools/${schoolId}/attendance`} style={{ color: "#53615a" }}>← Attendance</Link>
    <h1 style={{ margin: "20px 0 6px", fontSize: 34 }}>Attendance history</h1>
    <p style={{ margin: 0, color: "#53615a" }}>Review recorded attendance and correct mistakes without deleting the original record.</p>
    <section style={{ marginTop: 20, background: "white", borderRadius: 16, padding: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <label>Academic session<select value={sessionId} onChange={(e) => setSessionId(e.target.value)} style={inputStyle}>{sessions.map((s) => <option key={s.id} value={s.id}>{s.name} {s.status === "ACTIVE" ? "(Active)" : ""}</option>)}</select></label>
        <label>Class<select value={classArmId} onChange={(e) => setClassArmId(e.target.value)} style={inputStyle}>{classArms.map((a) => <option key={a.id} value={a.id}>{a.classLevel.name} — {a.name}</option>)}</select></label>
        <label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle}/></label>
        <label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle}/></label>
      </div>
      <button type="button" onClick={load} disabled={loading || !sessionId || !classArmId} style={buttonStyle}>{loading ? "Loading…" : "Load history"}</button>
    </section>
    {message && <div role="status" style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#f3f7f4" }}>{message}</div>}
    {Object.keys(grouped).length === 0 ? <div style={cardStyle}>No attendance records in the selected range.</div> : Object.entries(grouped).map(([date, rows]) => <section key={date} style={{ ...cardStyle, padding: 0, overflow: "hidden" }}><div style={{ padding: 14, fontWeight: 800, borderBottom: "1px solid #edf1ee" }}>{date}</div>{rows.map((row) => <div key={row.id} style={{ padding: 14, borderBottom: "1px solid #edf1ee", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><div><strong>{row.student.firstName} {row.student.middleName ? `${row.student.middleName} ` : ""}{row.student.lastName}</strong><div style={{ fontSize: 13, color: "#53615a", marginTop: 3 }}>{row.student.admissionNumber} · {labels[row.status]}{row.note ? ` · ${row.note}` : ""}</div></div><button type="button" onClick={() => correct(row)} disabled={loading} style={buttonStyle}>Correct</button></div>)}</section>)}
  </div></main>;
}

const inputStyle = { display: "block", width: "100%", marginTop: 6, padding: "10px 11px", border: "1px solid #ccd6d0", borderRadius: 9, background: "white", font: "inherit" };
const buttonStyle = { marginTop: 14, border: 0, borderRadius: 10, background: "#173d2c", color: "white", padding: "10px 15px", fontWeight: 800, cursor: "pointer" };
const cardStyle = { marginTop: 16, background: "white", borderRadius: 16, padding: 20, boxShadow: "0 8px 24px rgba(0,0,0,.05)" };
