"use client";

import { useEffect, useState } from "react";

type Fee = { id: string; name: string; amount: number; sessionName: string; termName: string };
type Student = { id: string; admissionNumber: string; firstName: string; lastName: string };
type Assignment = { id: string; studentId: string; feeStructureId: string; amount: string; admissionNumber: string; firstName: string; lastName: string; feeName: string; sessionName: string; termName: string };

export default function StudentFeeAssignmentWorkspace({ schoolId }: { schoolId: string }) {
  const [fees, setFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [studentId, setStudentId] = useState("");
  const [feeId, setFeeId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`/api/schools/${schoolId}/finance/student-fee-assignments`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? data.error ?? "Could not load assignments.");
      setAssignments(data.assignments ?? []);
      setFees(data.options?.fees ?? []);
      setStudents(data.options?.students ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load assignments."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [schoolId]);

  async function assign() {
    setMessage("");
    if (!studentId || !feeId) { setMessage("Select a student and fee."); return; }
    setSaving(true);
    try {
      const response = await fetch(`/api/schools/${schoolId}/finance/student-fee-assignments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId, feeStructureId: feeId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? data.error ?? "Could not assign fee.");
      setAssignments((current) => [{ ...data.assignment, amount: String(data.assignment.amount), admissionNumber: "", firstName: data.assignment.studentName.split(" ")[0] ?? "", lastName: data.assignment.studentName.split(" ").slice(-1)[0] ?? "", feeName: data.assignment.feeName, sessionName: "", termName: "" }, ...current]);
      setStudentId(""); setFeeId(""); setMessage("Fee assigned and audited.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not assign fee."); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ marginTop: 24, display: "grid", gap: 24 }}>
      <section style={{ border: "1px solid #dce3df", borderRadius: 16, padding: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Assign a fee</h2>
        <p style={{ color: "#53615a", marginTop: 6 }}>Only active students with an active enrollment in the fee's academic session can receive the fee.</p>
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <label>Student<select value={studentId} onChange={(e) => setStudentId(e.target.value)} style={inputStyle}><option value="">Select student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.firstName} {student.lastName} · {student.admissionNumber}</option>)}</select></label>
          <label>Fee<select value={feeId} onChange={(e) => setFeeId(e.target.value)} style={inputStyle}><option value="">Select fee</option>{fees.map((fee) => <option key={fee.id} value={fee.id}>{fee.name} · ₦{fee.amount.toLocaleString()} · {fee.sessionName} · {fee.termName}</option>)}</select></label>
        </div>
        <button type="button" onClick={assign} disabled={saving} style={buttonStyle}>{saving ? "Saving…" : "Assign fee"}</button>
        {message ? <p role="status" style={{ marginBottom: 0, color: message.includes("assigned") ? "#23633d" : "#8a3d2f" }}>{message}</p> : null}
      </section>
      <section style={{ border: "1px solid #dce3df", borderRadius: 16, padding: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Assigned fees</h2>
        {loading ? <p style={{ color: "#53615a" }}>Loading…</p> : assignments.length === 0 ? <p style={{ color: "#53615a" }}>No student fee assignments yet.</p> : (
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>{assignments.map((item) => <article key={item.id} style={{ border: "1px solid #e5e9e7", borderRadius: 12, padding: 14 }}><strong>{item.firstName} {item.lastName}</strong><div style={{ marginTop: 4, fontWeight: 700 }}>₦{Number(item.amount).toLocaleString()}</div><div style={{ color: "#53615a", marginTop: 4 }}>{item.feeName} · {item.sessionName} · {item.termName}{item.admissionNumber ? ` · ${item.admissionNumber}` : ""}</div></article>)}</div>
        )}
      </section>
    </div>
  );
}

const inputStyle: React.CSSProperties = { display: "block", width: "100%", marginTop: 6, padding: "10px 12px", border: "1px solid #ccd5d0", borderRadius: 10, background: "white" };
const buttonStyle: React.CSSProperties = { marginTop: 18, padding: "11px 16px", border: 0, borderRadius: 10, background: "#183c2a", color: "white", fontWeight: 700, cursor: "pointer" };
