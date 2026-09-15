"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

export default function ParentAcceptPage() {
  const params = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/parent/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: params.token, password }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(data.error ?? "Could not activate parent access.");
    window.location.href = `/app/schools/${data.schoolId}/communication`;
  }

  return <main style={{ minHeight: "100vh", padding: 32 }}><div style={{ maxWidth: 520, margin: "80px auto", background: "white", padding: 28, borderRadius: 16, boxShadow: "0 8px 28px rgba(0,0,0,.06)" }}><p style={{ fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>App-School</p><h1>Activate parent access</h1><p style={{ color: "#53615a" }}>Create your password to access your school account and receive in-app notices.</p><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (minimum 12 characters)" style={{ width: "100%", boxSizing: "border-box", padding: 12, marginTop: 12 }} /><button onClick={() => void accept()} disabled={busy || password.length < 12} style={{ marginTop: 14, padding: "11px 16px", border: 0, borderRadius: 10, background: "#183c2a", color: "white", fontWeight: 700 }}>{busy ? "Activating…" : "Activate access"}</button>{message && <p style={{ color: "#9a2d2d" }}>{message}</p>}</div></main>;
}
