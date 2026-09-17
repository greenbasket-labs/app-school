"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const registered = searchParams.get("registered") === "1";

  useEffect(() => {
    if (registered) setError("");
  }, [registered]);

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
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 440, background: "white", borderRadius: 20, padding: 32, boxShadow: "0 12px 40px rgba(0,0,0,.08)" }}>
        <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>SkulGo</p>
        <h1 style={{ margin: "12px 0 8px", fontSize: 32 }}>Sign in</h1>
        <p style={{ color: "#53615a", lineHeight: 1.5 }}>Use your SkulGo account to continue to your available school workspaces.</p>
        {registered && <p style={{ color: "#245c38", marginTop: 16 }}>Your personal account is ready. Sign in below.</p>}

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

        <p style={{ marginTop: 20, color: "#53615a", textAlign: "center" }}>
          Need a personal account? <Link href="/signup">Create one</Link>
        </p>
        <p style={{ marginTop: 10, color: "#53615a", textAlign: "center" }}>
          Registering a school? <Link href="/register">Create a school</Link>
        </p>
      </form>
    </main>
  );
}
