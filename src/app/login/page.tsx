"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to sign in.");
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f6f8f6" }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 440, background: "white", borderRadius: 20, padding: 32, boxShadow: "0 12px 40px rgba(0,0,0,.08)" }}>
        <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>SkulGo</p>
        <h1 style={{ margin: "12px 0 8px", fontSize: 32 }}>Sign in</h1>
        <p style={{ color: "#53615a", lineHeight: 1.5 }}>Use your personal SkulGo account. After sign-in, you will continue to the school space available to your account.</p>

        <label style={{ display: "block", marginTop: 24, fontWeight: 700 }}>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 8, padding: 12, borderRadius: 10, border: "1px solid #ccd6d0" }} />
        </label>

        <label style={{ display: "block", marginTop: 16, fontWeight: 700 }}>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 8, padding: 12, borderRadius: 10, border: "1px solid #ccd6d0" }} />
        </label>

        {error && <p role="alert" style={{ color: "#a32929", marginTop: 16 }}>{error}</p>}

        <button disabled={busy} type="submit" style={{ width: "100%", marginTop: 24, padding: 13, border: 0, borderRadius: 10, background: "#173d2a", color: "white", fontWeight: 700, cursor: busy ? "wait" : "pointer" }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p style={{ marginTop: 20, color: "#53615a", fontSize: 14 }}>
          Are you a school owner setting up a new school? <Link href="/register" style={{ color: "#173d2a", fontWeight: 700 }}>Register a school</Link>.
        </p>
      </form>
    </main>
  );
}
