"use client";

import { useEffect, useState } from "react";

type Profile = { name: string; address: string | null; phone: string | null; email: string | null };

export default function SchoolProfileSettings({ schoolId, canManage }: { schoolId: string; canManage: boolean }) {
  const [profile, setProfile] = useState<Profile>({ name: "", address: null, phone: null, email: null });
  const [status, setStatus] = useState("Loading…");

  useEffect(() => {
    fetch(`/api/schools/${schoolId}/settings/profile`).then(async (res) => {
      const data = await res.json();
      if (res.ok && data.profile) setProfile(data.profile);
      setStatus(res.ok ? "" : "Could not load school profile.");
    }).catch(() => setStatus("Could not load school profile."));
  }, [schoolId]);

  async function save() {
    setStatus("Saving…");
    const res = await fetch(`/api/schools/${schoolId}/settings/profile`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
    const data = await res.json();
    setStatus(res.ok ? "Saved." : data.error === "OWNER_REQUIRED" ? "Only the school owner can change the profile." : "Could not save profile.");
    if (res.ok) setProfile(data.profile);
  }

  return (
    <section style={{ marginTop: 24, padding: 20, border: "1px solid #dfe5e1", borderRadius: 16 }}>
      <h2 style={{ margin: 0, fontSize: 21 }}>School profile</h2>
      <p style={{ color: "#53615a", lineHeight: 1.5 }}>Basic identity and contact information used across the school workspace.</p>
      {!canManage && <p style={{ color: "#8a5a00" }}>Only the school owner can change these settings.</p>}
      <div style={{ display: "grid", gap: 12 }}>
        {(["name", "address", "phone", "email"] as const).map((field) => (
          <label key={field} style={{ display: "grid", gap: 6, fontWeight: 600 }}>
            {field === "name" ? "School name" : field[0].toUpperCase() + field.slice(1)}
            <input value={profile[field] ?? ""} disabled={!canManage} onChange={(e) => setProfile({ ...profile, [field]: e.target.value })} style={{ padding: 11, border: "1px solid #cfd8d2", borderRadius: 10 }} />
          </label>
        ))}
        <button onClick={save} disabled={!canManage || !profile.name.trim() || status === "Saving…"} style={{ padding: 11, border: 0, borderRadius: 10, cursor: canManage ? "pointer" : "not-allowed" }}>Save profile</button>
        {status && <small style={{ color: "#53615a" }}>{status}</small>}
      </div>
    </section>
  );
}
