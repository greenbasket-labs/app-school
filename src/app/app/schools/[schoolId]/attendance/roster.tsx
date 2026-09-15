"use client";

import { useEffect, useMemo, useState } from "react";

type Arm = { id: string; name: string; classLevel: { name: string } };
type SchoolSession = { id: string; name: string; status: string; classArms: Arm[] };
type RosterRow = { id: string; studentId: string; student: { admissionNumber: string; firstName: string; middleName: string | null; lastName: string }; attendance: { status: Status; note: string | null } | null };
type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

const statuses: Status[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
const labels: Record<Status, string> = { PRESENT: "Present", ABSENT: "Absent", LATE: "Late", EXCUSED: "Excused" };

export default function AttendanceRoster({ schoolId, canRecord, initialSessionId, sessions }: { schoolId: string; canRecord: boolean; initialSessionId: string; sessions: SchoolSession[] }) {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [classArmId, setClassArmId] = useState(sessions.find((s) => s.id === initialSessionId)?.classArms[0]?.id ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const selectedSession = sessions.find((s) => s.id === sessionId);
  const classArms = selectedSession?.classArms ?? [];

  useEffect(() => {
    if (!classArms.some((arm) => arm.id === classArmId)) setClassArmId(classArms[0]?.id ?? "");
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !classArmId || !date) return;
    let cancelled = false;
    setLoading(true); setMessage("");
    fetch(`/api/schools/${schoolId}/attendance/bulk?academicSessionId=${sessionId}&classArmId=${classArmId}&date=${date}`)
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.message || "Could not load attendance."); return data.roster as RosterRow[]; })
      .then((rows) => { if (!cancelled) { setRoster(rows); setStatus(Object.fromEntries(rows.map((row) => [row.studentId, row.attendance?.status ?? "PRESENT"]))); } })
      .catch((error) => { if (!cancelled) { setRoster([]); setMessage(error.message); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [schoolId, sessionId, classArmId, date]);

  const counts = useMemo(() => statuses.reduce((acc, item) => ({ ...acc, [item]: roster.filter((row) => status[row.studentId] === item).length }), {} as Record<Status, number>), [roster, status]);

  function setAll(next: Status) { setStatus((current) => Object.fromEntries(roster.map((row) => [row.studentId, next]))); }

  async function save() {
    if (!canRecord || roster.length === 0) return;
    setLoading(true); setMessage("");
    try {
      const response = await fetch(`/api/schools/${schoolId}/attendance/bulk`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ academicSessionId: sessionId, classArmId, attendanceDate: date, items: roster.map((row) => ({ studentId: row.studentId, enrollmentId: row.id, status: status[row.studentId] ?? "PRESENT" })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save attendance.");
      setMessage(`Saved ${data.records.length} attendance records.`);
      setRoster((rows) => rows.map((row) => ({ ...row, attendance: { status: status[row.studentId] ?? "PRESENT", note: null } })));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save attendance."); }
    finally { setLoading(false); }
  }

  return (
    <section style={{ marginTop: 24 }}>
      <div style={{ background: "white", borderRadius: 16, padding: 18, boxShadow: "0 8px 24px rgba(0,0,0,.05)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <label>Academic session<select value={sessionId} onChange={(e) => setSessionId(e.target.value)} style={inputStyle}>{sessions.map((s) => <option key={s.id} value={s.id}>{s.name} {s.status === "ACTIVE" ? "(Active)" : ""}</option>)}</select></label>
          <label>Class<select value={classArmId} onChange={(e) => setClassArmId(e.target.value)} style={inputStyle}>{classArms.map((arm) => <option key={arm.id} value={arm.id}>{arm.classLevel.name} — {arm.name}</option>)}</select></label>
          <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></label>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {statuses.map((item) => <button key={item} type="button" onClick={() => setAll(item)} disabled={!canRecord || loading || roster.length === 0} style={quickButton}>{labels[item]} all ({counts[item] ?? 0})</button>)}
        <span style={{ marginLeft: "auto", color: "#53615a", fontSize: 14 }}>{roster.length} students</span>
      </div>

      {message && <div role="status" style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#f3f7f4" }}>{message}</div>}
      {!canRecord && <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#fff8e8" }}>You can view attendance, but you do not have permission to record it.</div>}
      {loading && roster.length === 0 ? <div style={{ marginTop: 16, padding: 24, background: "white", borderRadius: 16 }}>Loading class roster…</div> : roster.length === 0 ? <div style={{ marginTop: 16, padding: 24, background: "white", borderRadius: 16 }}>No active students are enrolled in this class for the selected session.</div> : (
        <div style={{ marginTop: 16, background: "white", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,.05)" }}>
          {roster.map((row, index) => (
            <div key={row.id} style={{ padding: "14px 16px", borderBottom: index === roster.length - 1 ? undefined : "1px solid #edf1ee" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div><strong>{row.student.firstName} {row.student.middleName ? `${row.student.middleName} ` : ""}{row.student.lastName}</strong><div style={{ fontSize: 13, color: "#53615a", marginTop: 3 }}>{row.student.admissionNumber}</div></div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{statuses.map((item) => <button key={item} type="button" onClick={() => setStatus((current) => ({ ...current, [row.studentId]: item }))} disabled={!canRecord || loading} style={{ ...statusButton, fontWeight: status[row.studentId] === item ? 800 : 500, opacity: status[row.studentId] === item ? 1 : .65 }}>{labels[item]}</button>)}</div>
              </div>
            </div>
          ))}
          {canRecord && <div style={{ padding: 16, display: "flex", justifyContent: "flex-end", borderTop: "1px solid #edf1ee" }}><button type="button" onClick={save} disabled={loading} style={saveButton}>{loading ? "Saving…" : "Save attendance"}</button></div>}
        </div>
      )}
    </section>
  );
}

const inputStyle = { display: "block", width: "100%", marginTop: 6, padding: "10px 11px", border: "1px solid #ccd6d0", borderRadius: 9, background: "white", font: "inherit" };
const quickButton = { border: "1px solid #ccd6d0", borderRadius: 9, background: "white", padding: "8px 10px", cursor: "pointer" };
const statusButton = { border: "1px solid #ccd6d0", borderRadius: 8, background: "white", padding: "7px 9px", cursor: "pointer" };
const saveButton = { border: 0, borderRadius: 10, background: "#173d2c", color: "white", padding: "11px 16px", fontWeight: 800, cursor: "pointer" };
