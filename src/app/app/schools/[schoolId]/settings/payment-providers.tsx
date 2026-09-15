"use client";

import { useEffect, useState } from "react";

const PROVIDERS = ["PAYSTACK", "FLUTTERWAVE", "MONNIFY"] as const;

export default function PaymentProviderSettings({ schoolId, canManage }: { schoolId: string; canManage: boolean }) {
  const [providers, setProviders] = useState<any[]>([]);
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]>("PAYSTACK");
  const [reference, setReference] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch(`/api/schools/${schoolId}/settings/payment-providers`, { cache: "no-store" });
    const json = await response.json();
    if (response.ok) setProviders(json.providers ?? []);
  }

  useEffect(() => { if (canManage) load(); }, [schoolId, canManage]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch(`/api/schools/${schoolId}/settings/payment-providers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, settlementAccountReference: reference, enabled }),
    });
    const json = await response.json();
    if (!response.ok) { setMessage(json.message ?? "Could not save provider."); return; }
    setReference("");
    setMessage(`${provider} configuration saved.`);
    await load();
  }

  return (
    <section style={{ marginTop: 24, padding: 18, border: "1px solid #d9e0db", borderRadius: 14 }}>
      <h2 style={{ marginTop: 0 }}>Payment providers</h2>
      <p style={{ color: "#53615a", lineHeight: 1.5 }}>
        Configure the school&apos;s settlement account for supported payment providers. Provider credentials remain on the Green Basket server; this setting stores the school&apos;s provider settlement reference.
      </p>
      {!canManage ? <p>Only the school owner can configure payment providers.</p> : (
        <>
          <form onSubmit={save} style={{ display: "grid", gap: 10, maxWidth: 620 }}>
            <select value={provider} onChange={(e) => setProvider(e.target.value as (typeof PROVIDERS)[number])} style={{ padding: 11 }}>
              {PROVIDERS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input placeholder="School settlement / subaccount reference" value={reference} onChange={(e) => setReference(e.target.value)} required style={{ padding: 11 }} />
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled
            </label>
            <button type="submit" disabled={!reference.trim()} style={{ padding: 11, borderRadius: 9, border: 0, background: "#183c2a", color: "white", fontWeight: 700 }}>Save provider</button>
            {message && <p style={{ margin: 0 }}>{message}</p>}
          </form>
          <div style={{ marginTop: 18, display: "grid", gap: 8 }}>
            {providers.length === 0 ? <p>No payment provider configured.</p> : providers.map((item) => (
              <div key={item.id} style={{ padding: 12, border: "1px solid #e1e6e3", borderRadius: 10 }}>
                <strong>{item.provider}</strong> — {item.settlementAccountReference} — {item.enabled ? "Enabled" : "Disabled"}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
