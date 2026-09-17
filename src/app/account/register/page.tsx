"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function PersonalAccountRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const response = await fetch("/api/account/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Account creation failed.");
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account creation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 520, background: "white", borderRadius: 20, padding: 32, boxShadow: "0 12px 40px rgba(0,0,0,.08)" }}>
        <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>SkulGo</p>
        <h1 style={{ margin: "12px 0 8px", fontSize: 32 }}>Create your account</h1>
        <p style={{ color: "#53615a", lineHeight: 1.5 }}>
          Create one personal account. Your school connection is established separately when a school accepts your application or links you to a student record.
        </p>

        <label style={{ display: "block", marginTop: 22, fontWeight: 700 }}>
          Email
          <input value={form.email} onChange={(e) => update("email", e.target.value)} type="email" autoComplete="email" required style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 8, padding: 12, borderRadius: 10, border: "1px solid #ccd6d0" }} />
        </label>

        <label style={{ display: "block", marginTop: 16, fontWeight: 700 }}>
          Password
          <input value={form.password} onChange={(e) => update("password", e.target.value)} type="password" autoComplete="new-password" minLength={12} required style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 8, padding: 12, borderRadius: 10, border: "1px solid #ccd6d0" }} />
        </label>

        {error && <p role="alert" style={{ color: "#a32929", marginTop: 16 }}>{error}</p>}

        <button disabled={busy} type="submit" style={{ width: "100%", marginTop: 24, padding: 13, border: 0, borderRadius: 10, background: "#173d2a", color: "white", fontWeight: 700, cursor: busy ? "wait" : "pointer" }}>
          {busy ? "Creating account…" : "Create personal account"}
        </button>

        <p style={{ marginTop: 18, color: "#53615a", fontSize: 14 }}>
          Running a school? <Link href="/register" style={{ color: "#173d2a", fontWeight: 700 }}>Register the school instead.</Link>
        </p>
      </form>
    </main>
  );
}
