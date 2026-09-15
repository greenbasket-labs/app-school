"use client";

import { useEffect, useState } from "react";

type Assignment = {
  id: string;
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  feeName: string;
  amount: number;
  dueDate: string | null;
};

type Invoice = {
  id: string;
  studentId: string;
  studentFeeAssignmentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  feeName: string;
  amount: number;
  dueDate: string | null;
  status: string;
  issuedAt: string;
};

export default function InvoiceWorkspace({ schoolId }: { schoolId: string }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`/api/schools/${schoolId}/finance/invoices`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? data.error ?? "Could not load invoices.");
      setAssignments(data.uninvoicedAssignments ?? []);
      setInvoices(data.invoices ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load invoices.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [schoolId]);

  async function createInvoice() {
    setMessage("");
    if (!selectedAssignmentId) {
      setMessage("Select a student fee assignment first.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/schools/${schoolId}/finance/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentFeeAssignmentId: selectedAssignmentId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? data.error ?? "Could not create invoice.");
      setMessage("Student obligation created and audited.");
      setSelectedAssignmentId("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create invoice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 24, display: "grid", gap: 24 }}>
      <section style={{ border: "1px solid #dce3df", borderRadius: 16, padding: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Create student obligation</h2>
        <p style={{ color: "#53615a", marginTop: 6 }}>
          An invoice turns an existing fee assignment into a specific amount the student owes. It does not record payment.
        </p>
        <select value={selectedAssignmentId} onChange={(e) => setSelectedAssignmentId(e.target.value)} style={inputStyle}>
          <option value="">Select assigned fee</option>
          {assignments.map((assignment) => (
            <option key={assignment.id} value={assignment.id}>
              {assignment.admissionNumber} · {assignment.firstName} {assignment.lastName} · {assignment.feeName} · ₦{assignment.amount.toLocaleString()}
            </option>
          ))}
        </select>
        <button type="button" onClick={createInvoice} disabled={saving} style={buttonStyle}>
          {saving ? "Creating…" : "Create obligation"}
        </button>
        {message ? <p role="status" style={{ marginBottom: 0, color: message.includes("created") ? "#23633d" : "#8a3d2f" }}>{message}</p> : null}
      </section>

      <section style={{ border: "1px solid #dce3df", borderRadius: 16, padding: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Open obligations</h2>
        {loading ? <p style={{ color: "#53615a" }}>Loading…</p> : invoices.length === 0 ? <p style={{ color: "#53615a" }}>No student obligations yet.</p> : (
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {invoices.map((invoice) => (
              <article key={invoice.id} style={{ border: "1px solid #e5e9e7", borderRadius: 12, padding: 14 }}>
                <strong>{invoice.firstName} {invoice.lastName}</strong>
                <div style={{ marginTop: 4 }}>{invoice.feeName}</div>
                <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>₦{invoice.amount.toLocaleString()}</div>
                <div style={{ color: "#53615a", marginTop: 4 }}>
                  {invoice.admissionNumber} · {invoice.status}{invoice.dueDate ? ` · Due ${invoice.dueDate}` : ""}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const inputStyle: React.CSSProperties = { display: "block", width: "100%", padding: "10px 12px", border: "1px solid #ccd5d0", borderRadius: 10, background: "white" };
const buttonStyle: React.CSSProperties = { marginTop: 14, padding: "11px 16px", border: 0, borderRadius: 10, background: "#183c2a", color: "white", fontWeight: 700, cursor: "pointer" };
