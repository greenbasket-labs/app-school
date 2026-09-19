"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const CAPACITIES = [
  { value: "OWNER", label: "Owner / Proprietor" },
  { value: "PRINCIPAL", label: "Principal" },
  { value: "HEADMASTER", label: "Headmaster / Headmistress" },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    organizationName: "",
    schoolName: "",
    capacity: "OWNER",
    cacNumber: "",
  });
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
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to register your school.");
      }

      router.push(`/app/schools/${data.schoolId}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to register your school.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 560,
          background: "white",
          borderRadius: 20,
          padding: 32,
          boxShadow: "0 12px 40px rgba(0,0,0,.08)",
        }}
      >
        <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>
          SkulGo account
        </p>
        <h1 style={{ margin: "12px 0 8px", fontSize: 32 }}>Register a school</h1>
        <p style={{ color: "#53615a", lineHeight: 1.5 }}>
          Your personal SkulGo account stays the same. Create a school workspace
          and tell us your capacity at the school.
        </p>

        <label style={{ display: "block", marginTop: 16, fontWeight: 700 }}>
          Organization / proprietor name
          <input
            value={form.organizationName}
            onChange={(event) => update("organizationName", event.target.value)}
            required
            placeholder="e.g. AHM Education"
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              marginTop: 8,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ccd6d0",
            }}
          />
        </label>

        <label style={{ display: "block", marginTop: 16, fontWeight: 700 }}>
          School name
          <input
            value={form.schoolName}
            onChange={(event) => update("schoolName", event.target.value)}
            required
            placeholder="e.g. AHM International School"
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              marginTop: 8,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ccd6d0",
            }}
          />
        </label>

        <label style={{ display: "block", marginTop: 16, fontWeight: 700 }}>
          Your capacity at the school
          <select
            value={form.capacity}
            onChange={(event) => update("capacity", event.target.value)}
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              marginTop: 8,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ccd6d0",
              background: "white",
            }}
          >
            {CAPACITIES.map((capacity) => (
              <option key={capacity.value} value={capacity.value}>
                {capacity.label}
              </option>
            ))}
          </select>
          <span style={{ display: "block", marginTop: 6, color: "#68756e", fontSize: 13, fontWeight: 400 }}>
            This records your school role during onboarding. Access permissions are managed separately.
          </span>
        </label>

        <label style={{ display: "block", marginTop: 16, fontWeight: 700 }}>
          CAC registration number <span style={{ color: "#68756e", fontWeight: 400 }}>(optional for now)</span>
          <input
            value={form.cacNumber}
            onChange={(event) => update("cacNumber", event.target.value)}
            placeholder="Enter CAC number if available"
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              marginTop: 8,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ccd6d0",
            }}
          />
          <span style={{ display: "block", marginTop: 6, color: "#68756e", fontSize: 13, fontWeight: 400 }}>
            You can add or verify this information later.
          </span>
        </label>

        {error && (
          <p role="alert" style={{ color: "#a32929", marginTop: 16 }}>
            {error}
          </p>
        )}

        <button
          disabled={busy}
          type="submit"
          style={{
            width: "100%",
            marginTop: 24,
            padding: 13,
            border: 0,
            borderRadius: 10,
            background: "#173d2a",
            color: "white",
            fontWeight: 700,
          }}
        >
          {busy ? "Creating school…" : "Create school"}
        </button>
      </form>
    </main>
  );
}
