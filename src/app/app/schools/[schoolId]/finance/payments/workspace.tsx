"use client";

import { useEffect, useState } from "react";

export default function PaymentWorkspace({ schoolId }: { schoolId: string }) {
  const [data, setData] = useState<any>({ payments: [], options: [] });
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlineLoading, setOnlineLoading] = useState(false);

  async function load() {
    setLoading(true);
    const response = await fetch(`/api/schools/${schoolId}/finance/payments`, { cache: "no-store" });
    const json = await response.json();
    if (response.ok) setData(json);
    else setMessage(json.message ?? "Unable to load payments.");
    setLoading(false);
  }

  useEffect(() => { load(); }, [schoolId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch(`/api/schools/${schoolId}/finance/payments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, amount: Number(amount), reference: reference || undefined, note: note || undefined }),
    });
    const json = await response.json();
    if (!response.ok) { setMessage(json.message ?? "Payment could not be recorded."); return; }
    setMessage("Payment recorded."); setAmount(""); setReference(""); setNote(""); await load();
  }

  async function startOnlinePayment(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setOnlineLoading(true);
    try {
      const response = await fetch(`/api/schools/${schoolId}/finance/payments/paystack/initialize`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, payerEmail }),
      });
      const json = await response.json();
      if (!response.ok) { setMessage(json.message ?? "Online payment could not be initialized."); return; }
      window.location.assign(json.payment.checkoutUrl);
    } finally {
      setOnlineLoading(false);
    }
  }

  return (
    <section style={{ marginTop: 24 }}>
      <form onSubmit={submit} style={{ display: "grid", gap: 10, maxWidth: 620, padding: 18, border: "1px solid #d9e0db", borderRadius: 14 }}>
        <h2 style={{ margin: 0 }}>Record payment</h2>
        <select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} required style={{ padding: 11 }}>
          <option value="">Select invoice</option>
          {data.options.map((item: any) => {
            const outstanding = Number(item.amount) - Number(item.paidAmount);
            return <option key={item.id} value={item.id}>{item.firstName} {item.lastName} — {item.feeName} — Outstanding {outstanding.toFixed(2)}</option>;
          })}
        </select>
        <input type="number" min="0.01" step="0.01" placeholder="Amount received" value={amount} onChange={(e) => setAmount(e.target.value)} required style={{ padding: 11 }} />
        <input placeholder="Payment reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} style={{ padding: 11 }} />
        <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={{ padding: 11 }} />
        <button type="submit" disabled={!invoiceId || !amount} style={{ padding: 11, borderRadius: 9, border: 0, background: "#183c2a", color: "white", fontWeight: 700 }}>Record payment</button>
      </form>

      <form onSubmit={startOnlinePayment} style={{ display: "grid", gap: 10, maxWidth: 620, marginTop: 18, padding: 18, border: "1px solid #d9e0db", borderRadius: 14 }}>
        <h2 style={{ margin: 0 }}>Start online payment</h2>
        <p style={{ margin: 0, color: "#53615a" }}>Paystack will open checkout for the invoice&apos;s current outstanding balance. Final payment confirmation comes from the provider webhook.</p>
        <input type="email" placeholder="Payer email" value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} required style={{ padding: 11 }} />
        <button type="submit" disabled={!invoiceId || !payerEmail || onlineLoading} style={{ padding: 11, borderRadius: 9, border: 0, background: "#315f45", color: "white", fontWeight: 700 }}>{onlineLoading ? "Opening checkout…" : "Pay online with Paystack"}</button>
      </form>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}

      <div style={{ marginTop: 28 }}>
        <h2>Recent payments</h2>
        {loading ? <p>Loading…</p> : data.payments.length === 0 ? <p>No payments recorded yet.</p> : (
          <div style={{ display: "grid", gap: 8 }}>
            {data.payments.map((payment: any) => (
              <div key={payment.id} style={{ padding: 12, border: "1px solid #e1e6e3", borderRadius: 10 }}>
                <strong>{payment.firstName} {payment.lastName}</strong> — {payment.feeName} — {Number(payment.amount).toFixed(2)} — {new Date(payment.paidAt).toLocaleString()}
                {payment.reference ? ` — Ref: ${payment.reference}` : ""}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
