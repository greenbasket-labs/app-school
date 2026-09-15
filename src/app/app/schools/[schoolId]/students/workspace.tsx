"use client";

import { useMemo, useState } from "react";

type Session = { id: string; name: string; status: string; classArms: { id: string; name: string; classLevel: { name: string } }[] };
type Student = { id: string; admissionNumber: string; firstName: string; middleName: string | null; lastName: string; status: string; enrollments: { id: string; status: string; academicSession: { id: string; name: string }; classArm: { id: string; name: string; classLevel: { name: string } } }[] };

export default function StudentWorkspace({ schoolId, canManage, initialStudents, sessions }: { schoolId: string; canManage: boolean; initialStudents: Student[]; sessions: Session[] }) {
  const [students, setStudents] = useState(initialStudents);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ admissionNumber: "", firstName: "", middleName: "", lastName: "", dateOfBirth: "" });
  const [enroll, setEnroll] = useState<{ studentId: string; sessionId: string; classArmId: string }>({ studentId: "", sessionId: sessions[0]?.id ?? "", classArmId: sessions[0]?.classArms[0]?.id ?? "" });

  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return students; return students.filter((s) => `${s.firstName} ${s.middleName ?? ""} ${s.lastName} ${s.admissionNumber}`.toLowerCase().includes(q)); }, [students, query]);
  const selectedSession = sessions.find((s) => s.id === enroll.sessionId);

  function updateSession(id: string) { const s = sessions.find((item) => item.id === id); setEnroll((current) => ({ ...current, sessionId: id, classArmId: s?.classArms[0]?.id ?? "" })); }

  async function createStudent(event: React.FormEvent) {
    event.preventDefault(); if (!canManage) return; setSaving(true); setMessage("");
    try { const res = await fetch(`/api/schools/${schoolId}/students`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const data = await res.json(); if (!res.ok) throw new Error(data.message || data.error || "Could not create student."); setStudents((current) => [...current, { ...data.student, enrollments: [] }].sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`))); setForm({ admissionNumber: "", firstName: "", middleName: "", lastName: "", dateOfBirth: "" }); setShowForm(false); setMessage("Student record created."); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not create student."); } finally { setSaving(false); }
  }

  async function enrollStudent(event: React.FormEvent) {
    event.preventDefault(); if (!canManage || !enroll.studentId || !enroll.sessionId || !enroll.classArmId) return; setSaving(true); setMessage("");
    try { const res = await fetch(`/api/schools/${schoolId}/enrollments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId: enroll.studentId, academicSessionId: enroll.sessionId, classArmId: enroll.classArmId }) }); const data = await res.json(); if (!res.ok) throw new Error(data.message || data.error || "Could not enroll student."); setStudents((current) => current.map((s) => s.id === enroll.studentId ? { ...s, enrollments: [data.enrollment, ...s.enrollments] } : s)); setMessage("Student enrolled successfully."); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not enroll student."); } finally { setSaving(false); }
  }

  async function changeStatus(studentId: string, status: string) {
    if (!canManage) return;
    const student = students.find((item) => item.id === studentId);
    if (!student || student.status === status) return;
    if (status === "WITHDRAWN" && !window.confirm("Withdraw this student? This is a terminal status and cannot be reversed.")) return;
    setSaving(true); setMessage("");
    try {
      const res = await fetch(`/api/schools/${schoolId}/students/${studentId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Could not change student status.");
      setStudents((current) => current.map((item) => item.id === studentId ? { ...item, status: data.student.status } : item));
      setMessage(`Student status changed to ${data.student.status}. Change audited.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not change student status."); } finally { setSaving(false); }
  }

  return <section style={{ marginTop: 24 }}>
    {message && <div role="status" style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: "#f3f7f4" }}>{message}</div>}
    <div style={{ background: "white", borderRadius: 16, padding: 18, boxShadow: "0 8px 24px rgba(0,0,0,.05)" }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or admission number" style={inputStyle} /><span style={{ color: "#53615a", fontSize: 14 }}>{filtered.length} of {students.length} students</span>{canManage && <button type="button" onClick={() => setShowForm((v) => !v)} style={primary}>{showForm ? "Close" : "+ Add student"}</button>}</div>
      {showForm && <form onSubmit={createStudent} style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #edf1ee", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
        <input required placeholder="Admission number" value={form.admissionNumber} onChange={(e) => setForm({ ...form, admissionNumber: e.target.value })} style={inputStyle} /><input required placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} style={inputStyle} /><input placeholder="Middle name" value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} style={inputStyle} /><input required placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} style={inputStyle} /><input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} style={inputStyle} /><button disabled={saving} style={primary}>{saving ? "Saving…" : "Create student"}</button>
      </form>}
    </div>

    {canManage && students.length > 0 && sessions.length > 0 && <form onSubmit={enrollStudent} style={{ marginTop: 12, background: "white", borderRadius: 16, padding: 18, boxShadow: "0 8px 24px rgba(0,0,0,.05)" }}><strong>Enroll student</strong><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, marginTop: 12 }}><select required value={enroll.studentId} onChange={(e) => setEnroll({ ...enroll, studentId: e.target.value })} style={inputStyle}><option value="">Select student</option>{students.filter((s) => s.status === "ACTIVE").map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName} — {s.admissionNumber}</option>)}</select><select required value={enroll.sessionId} onChange={(e) => updateSession(e.target.value)} style={inputStyle}>{sessions.map((s) => <option key={s.id} value={s.id}>{s.name} {s.status === "ACTIVE" ? "(Active)" : ""}</option>)}</select><select required value={enroll.classArmId} onChange={(e) => setEnroll({ ...enroll, classArmId: e.target.value })} style={inputStyle}><option value="">Select class</option>{selectedSession?.classArms.map((a) => <option key={a.id} value={a.id}>{a.classLevel.name} — {a.name}</option>)}</select><button disabled={saving} style={primary}>{saving ? "Saving…" : "Enroll"}</button></div></form>}

    <div style={{ marginTop: 12, background: "white", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,.05)" }}>{filtered.length === 0 ? <div style={{ padding: 24, color: "#53615a" }}>No students found.</div> : filtered.map((student, index) => { const current = student.enrollments.find((e) => e.status === "ACTIVE"); return <div key={student.id} style={{ padding: 16, borderBottom: index === filtered.length - 1 ? undefined : "1px solid #edf1ee" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><strong>{student.firstName} {student.middleName ? `${student.middleName} ` : ""}{student.lastName}</strong><div style={{ marginTop: 3, color: "#53615a", fontSize: 13 }}>{student.admissionNumber}</div></div><div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>{canManage ? <select value={student.status} onChange={(e) => changeStatus(student.id, e.target.value)} disabled={saving || student.status === "WITHDRAWN"} style={{ ...inputStyle, width: "auto", minWidth: 125 }}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="WITHDRAWN">Withdrawn</option></select> : <span style={{ fontSize: 13, fontWeight: 700 }}>{student.status}</span>}{current ? <div style={{ textAlign: "right", color: "#53615a", fontSize: 14 }}><strong>{current.classArm.classLevel.name} — {current.classArm.name}</strong><div>{current.academicSession.name}</div></div> : <span style={{ color: "#53615a", fontSize: 14 }}>Not enrolled</span>}</div></div></div>; })}</div>
  </section>;
}

const inputStyle = { width: "100%", boxSizing: "border-box" as const, padding: "10px 11px", border: "1px solid #ccd6d0", borderRadius: 9, background: "white", font: "inherit" };
const primary = { border: 0, borderRadius: 9, background: "#173d2c", color: "white", padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
