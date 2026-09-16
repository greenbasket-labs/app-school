"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

export default function ParentAcceptPage() {
  const params = useParams<{ token: string }>();
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [activated, setActivated] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [verification, setVerification] = useState<{ emailVerified: boolean; phoneVerified: boolean } | null>(null);

  async function accept() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/parent/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: params.token }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(data.error ?? "Could not activate parent access.");
    setTemporaryPassword(data.temporaryPassword);
    setActivated(true);
  }

  async function changePassword() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/auth/first-login-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: temporaryPassword, newPassword }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(data.error ?? "Could not change password.");
    const verificationResponse = await fetch("/api/auth/guardian-verification");
    const verificationData = await verificationResponse.json();
    setVerification(verificationData.ok ? verificationData : null);
    setPasswordChanged(true);
    setMessage("Password changed successfully.");
  }

  if (activated && !passwordChanged) {
    return <main style={{ minHeight: "100vh", padding: 32 }}><div style={{ maxWidth: 520, margin: "80px auto", background: "white", padding: 28, borderRadius: 16, boxShadow: "0 8px 28px rgba(0,0,0,.06)" }}><p style={{ fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>App-School</p><h1>Set your password</h1><p style={{ color: "#53615a" }}>Your temporary password was created for this first login. Keep it private and replace it now.</p><p style={{ padding: 12, background: "#f4f6f4", borderRadius: 8, wordBreak: "break-all" }}><strong>Temporary password:</strong> {temporaryPassword}</p><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (minimum 12 characters)" style={{ width: "100%", boxSizing: "border-box", padding: 12, marginTop: 12 }} /><button onClick={() => void changePassword()} disabled={busy || newPassword.length < 12} style={{ marginTop: 14, padding: "11px 16px", border: 0, borderRadius: 10, background: "#183c2a", color: "white", fontWeight: 700 }}>{busy ? "Saving…" : "Change password"}</button>{message && <p style={{ color: "#9a2d2d" }}>{message}</p>}</div></main>;
  }

  if (passwordChanged) {
    return <main style={{ minHeight: "100vh", padding: 32 }}><div style={{ maxWidth: 520, margin: "80px auto", background: "white", padding: 28, borderRadius: 16, boxShadow: "0 8px 28px rgba(0,0,0,.06)" }}><p style={{ fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>App-School</p><h1>Account secured</h1><p>Your password has been changed.</p><p>Email verification: {verification?.emailVerified ? "Verified" : "Pending"}</p><p>Phone verification: {verification?.phoneVerified ? "Verified" : "Pending"}</p><p style={{ color: "#53615a" }}>Contact verification must be completed before protected parent information is available.</p></div></main>;
  }

  return <main style={{ minHeight: "100vh", padding: 32 }}><div style={{ maxWidth: 520, margin: "80px auto", background: "white", padding: 28, borderRadius: 16, boxShadow: "0 8px 28px rgba(0,0,0,.06)" }}><p style={{ fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>App-School</p><h1>Activate parent access</h1><p style={{ color: "#53615a" }}>Use this invitation to activate the account created for you by your school.</p><button onClick={() => void accept()} disabled={busy} style={{ marginTop: 14, padding: "11px 16px", border: 0, borderRadius: 10, background: "#183c2a", color: "white", fontWeight: 700 }}>{busy ? "Activating…" : "Activate access"}</button>{message && <p style={{ color: "#9a2d2d" }}>{message}</p>}</div></main>;
}
