"use client";

import { useEffect, useState } from "react";

type Term = { id: string; name: string; order: number };
type Session = { id: string; name: string; status: string; terms: Term[] };
type FeeStructure = {
  id: string;
  academicSessionId: string;
  academicTermId: string;
  sessionName: string;
  termName: string;
  name: string;
  amount: number;
  description: string | null;
  dueDate: string | null;
  isActive: boolean;
};

export default function FeeStructureWorkspace({ schoolId }: { schoolId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [fees, setFees] = useState<FeeStructure[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [termId, setTermId] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`/api/schools/${schoolId}/finance/fee-structures`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? data.error ?? "Could not load fee structures.");
      setFees(data.feeStructures ?? []);
      const nextSessions: Session[] = data.options ?? [];
      setSessions(nextSessions);
      if (!sessionId && nextSessions[0]) {
        setSessionId(nextSessions[0].id);
        setTermId(nextSessions[0].terms[0]?.id ?? "");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load fee structures.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [schoolId]);

  const selectedSession = sessions.find((session) => session.id === sessionId);

  function changeSession(value: string) {
    const session = sessions.find((item) => item.id === value);
    setSessionId(value);
    setTermId(session?.terms[0]?.id ?? "");
  }

  async function createFee() {
    setMessage("");
    if (!sessionId || !termId || !name.trim() || !amount) {
      setMessage("Complete session, term, fee name and amount.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/schools/${schoolId}/finance/fee-structures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicSessionId: sessionId,
          academicTermId: termId,
          name,
          amount: Number(amount),
          description: description || undefined,
          dueDate: dueDate || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? data.error ?? "Could not create fee.");
      setFees((current) => [...current, data.feeStructure]);
      setName(""); setAmount(""); setDescription(""); setDueDate("");
      setMessage("Fee structure created and audited.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create fee.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 24, display: "grid", gap: 24 }}>
      <section style={{ border: "1px solid #dce3df", borderRadius: 16, padding: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Define a fee</h2>
        <p style={{ color: "#53615a", marginTop: 6 }}>This is only the school's fee list. It does not create a student's debt or record a payment.</p>
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
          <label>Academic session<select value={sessionId} onChange={(e) => changeSession(e.target.value)} style={inputStyle}><option value="">Select session</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.name} · {session.status}</option>)}</select></label>
          <label>Term<select value={termId} onChange={(e) => setTermId(e.target.value)} style={inputStyle}><option value="">Select term</option>{(selectedSession?.terms ?? []).map((term) => <option key={term.id} value={term.id}>{term.order}. {term.name}</option>)}</select></label>
          <label>Fee name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tuition" maxLength={120} style={inputStyle} /></label>
          <label>Amount (₦)<input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" inputMode="decimal" min="0.01" step="0.01" style={inputStyle} /></label>
          <label>Description<input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" maxLength={500} style={inputStyle} /></label>
          <label>Due date<input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" style={inputStyle} /></label>
        </div>
        <button type="button" onClick={createFee} disabled={saving} style={buttonStyle}>{saving ? "Saving…" : "Create fee"}</button>
        {message ? <p role="status" style={{ marginBottom: 0, color: message.includes("created") ? "#23633d" : "#8a3d2f" }}>{message}</p> : null}
      </section>

      <section style={{ border: "1px solid #dce3df", borderRadius: 16, padding: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Fee structures</h2>
        {loading ? <p style={{ color: "#53615a" }}>Loading…</p> : fees.length === 0 ? <p style={{ color: "#53615a" }}>No fee structures yet.</p> : (
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {fees.map((fee) => (
              <article key={fee.id} style={{ border: "1px solid #e5e9e7", borderRadius: 12, padding: 14 }}>
                <strong>{fee.name}</strong>
                <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>₦{fee.amount.toLocaleString()}</div>
                <div style={{ color: "#53615a", marginTop: 4 }}>{fee.sessionName} · {fee.termName}{fee.dueDate ? ` · Due ${fee.dueDate}` : ""}{fee.description ? ` · ${fee.description}` : ""}</div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const inputStyle: React.CSSProperties = { display: "block", width: "100%", marginTop: 6, padding: "10px 12px", border: "1px solid #ccd5d0", borderRadius: 10, background: "white" };
const buttonStyle: React.CSSProperties = { marginTop: 18, padding: "11px 16px", border: 0, borderRadius: 10, background: "#183c2a", color: "white", fontWeight: 700, cursor: "pointer" };
