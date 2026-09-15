"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function PaymentWorkspace({ schoolId }: { schoolId: string }) {
  const [data, setData] = useState<any>({ payments: [], options: [] });
  const [providers, setProviders] = useState<string[]>([]);
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlineLoading, setOnlineLoading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [paymentsResponse, providersResponse] = await Promise.all([
      fetch(`/api/schools/${schoolId}/finance/payments`, { cache: "no-store" }),
      fetch(`/api/schools/${schoolId}/finance/payments/providers`, { cache: "no-store" }),
    ]);
    const paymentsJson = await paymentsResponse.json();
    const providersJson = await providersResponse.json();
    if (paymentsResponse.ok) setData(paymentsJson);
    else setMessage(paymentsJson.message ?? "Unable to load payments.");
    if (providersResponse.ok) setProviders(providersJson.providers ?? []);
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

  async function startOnlinePayment(provider: string) {
    setMessage("");
    setOnlineLoading(provider);
    try {
      const path = provider === "PAYSTACK" ? "paystack" : provider === "FLUTTERWAVE" ? "flutterwave" : provider === "MONNIFY" ? "monnify" : null;
      if (!path) { setMessage(`${provider} checkout is not implemented yet.`); return; }
      const response = await fetch(`/api/schools/${schoolId}/finance/payments/${path}/initialize`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, payerEmail }),
      });
      const json = await response.json();
      if (!response.ok) { setMessage(json.message ?? "Online payment could not be initialized."); return; }
      window.location.assign(json.payment.checkoutUrl);
    } finally {
      setOnlineLoading(null);
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

      <div style={{ display: "grid", gap: 10, maxWidth: 620, marginTop: 18, padding: 18, border: "1px solid #d9e0db", borderRadius: 14 }}>
        <h2 style={{ margin: 0 }}>Start online payment</h2>
        <p style={{ margin: 0, color: "#53615a" }}>Choose a provider configured by the school owner. The checkout uses the invoice&apos;s current outstanding balance.</p>
        <input type="email" placeholder="Payer email" value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} required style={{ padding: 11 }} />
        {providers.length === 0 ? <p style={{ margin: 0 }}>No online payment provider is configured for this school.</p> : providers.map((provider) => (
          <button key={provider} type="button" onClick={() => startOnlinePayment(provider)} disabled={!invoiceId || !payerEmail || onlineLoading !== null} style={{ padding: 11, borderRadius: 9, border: 0, background: "#315f45", color: "white", fontWeight: 700 }}>
            {onlineLoading === provider ? "Opening checkout…" : `Pay online with ${provider}`}
          </button>
        ))}
      </div>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}

      <div style={{ marginTop: 28 }}>
        <h2>Recent payments</h2>
        {loading ? <p>Loading…</p> : data.payments.length === 0 ? <p>No payments recorded yet.</p> : (
          <div style={{ display: "grid", gap: 8 }}>
            {data.payments.map((payment: any) => (
              <div key={payment.id} style={{ padding: 12, border: "1px solid #e1e6e3", borderRadius: 10 }}>
                <strong>{payment.firstName} {payment.lastName}</strong> — {payment.feeName} — {Number(payment.amount).toFixed(2)} — {new Date(payment.paidAt).toLocaleString()}
                {payment.reference ? ` — Ref: ${payment.reference}` : ""}
                <div style={{ marginTop: 8 }}><Link href={`/app/schools/${schoolId}/finance/receipts?paymentId=${payment.id}`} style={{ color: "#183c2a", fontWeight: 700 }}>View receipt →</Link></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
