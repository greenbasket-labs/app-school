"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "", schoolName: "" });
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
      const response = await fetch("/api/onboarding/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, organizationName: form.schoolName, cacNumber: "" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Registration failed.");
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 560, background: "white", borderRadius: 20, padding: 32, boxShadow: "0 12px 40px rgba(0,0,0,.08)" }}>
        <div style={{ fontWeight: 700, fontSize: 20 }}>SkulGo</div>
        <h1 style={{ margin: "12px 0 24px", fontSize: 32 }}>Register your school</h1>

        {[
          ["schoolName", "School name", "text"],
          ["email", "Owner email", "email"],
          ["password", "Password", "password"],
          ["confirmPassword", "Confirm password", "password"],
        ].map(([field, label, type]) => (
          <label key={field} style={{ display: "block", marginTop: 16, fontWeight: 700 }}>
            {label}
            <input value={form[field as keyof typeof form]} onChange={(e) => update(field as keyof typeof form, e.target.value)} type={type} required minLength={field === "password" ? 12 : undefined} style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 8, padding: 12, borderRadius: 10, border: "1px solid #ccd6d0" }} />
          </label>
        ))}

        {error && <p role="alert" style={{ color: "#a32929", marginTop: 16 }}>{error}</p>}
        <button disabled={busy} type="submit" style={{ width: "100%", marginTop: 24, padding: 13, border: 0, borderRadius: 10, background: "#173d2a", color: "white", fontWeight: 700 }}>
          {busy ? "Registering school…" : "Register school"}
        </button>
        <p style={{ marginTop: 16, textAlign: "center" }}>
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </form>
    </main>
  );
}
