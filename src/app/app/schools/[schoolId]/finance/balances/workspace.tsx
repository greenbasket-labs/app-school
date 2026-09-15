"use client";
import { useEffect, useState } from "react";
export default function BalanceWorkspace({ schoolId }: { schoolId: string }) {
  const [data, setData] = useState<any>({ balances: [], summary: null });
  useEffect(() => { fetch(`/api/schools/${schoolId}/finance/balances`, { cache: "no-store" }).then(r => r.json()).then(setData); }, [schoolId]);
  const s = data.summary;
  return <section style={{ marginTop: 20 }}>
    {s && <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
      {[["Invoices", s.invoiceCount], ["Invoiced", s.invoiced.toFixed(2)], ["Paid", s.paid.toFixed(2)], ["Outstanding", s.outstanding.toFixed(2)]].map(([label, value]) => <div key={String(label)} style={{ padding: 16, border: "1px solid #d9e0db", borderRadius: 12 }}><small>{label}</small><div style={{ fontSize: 22, fontWeight: 700, marginTop: 5 }}>{value}</div></div>)}
    </div>}
    <h2 style={{ marginTop: 28 }}>Student balances</h2>
    {data.balances?.length === 0 ? <p>No invoices yet.</p> : <div style={{ display: "grid", gap: 8 }}>{data.balances?.map((b: any) => <div key={b.invoiceId} style={{ padding: 12, border: "1px solid #e1e6e3", borderRadius: 10 }}><strong>{b.firstName} {b.lastName}</strong> — {b.feeName}<br />Charged {Number(b.invoiceAmount).toFixed(2)} · Paid {Number(b.paidAmount).toFixed(2)} · <strong>Outstanding {Number(b.outstanding).toFixed(2)}</strong></div>)}</div>}
  </section>;
}
