"use client";

import { useEffect, useState } from "react";

const CAPABILITIES = [
  "SCHOOL.MANAGE",
  "STUDENTS.VIEW",
  "STUDENTS.MANAGE",
  "ATTENDANCE.RECORD",
  "ATTENDANCE.VIEW",
  "ASSESSMENT.CREATE",
  "RESULT.SUBMIT",
  "RESULT.APPROVE",
  "FINANCE.VIEW",
  "FINANCE.MANAGE",
];

function label(code: string) { return code.replaceAll(".", " · ").replaceAll("_", " "); }

export default function StaffSettings({ schoolId, canManage }: { schoolId: string; canManage: boolean }) {
  const [staff, setStaff] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState<string[]>(["STUDENTS.VIEW", "ATTENDANCE.VIEW"]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const response = await fetch(`/api/schools/${schoolId}/settings/staff`, { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setStaff(data.staff ?? []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [schoolId]);

  function toggle(code: string) { setSelected((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]); }

  async function createStaff(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    const response = await fetch(`/api/schools/${schoolId}/settings/staff`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, capabilityCodes: selected }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? "Could not create staff account."); return; }
    setMessage(`Staff account created for ${data.staff.email}.`); setEmail(""); setPassword(""); await load();
  }

  async function saveAccess(membershipId: string, capabilityCodes: string[]) {
    setMessage("");
    const response = await fetch(`/api/schools/${schoolId}/settings/staff`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ membershipId, capabilityCodes }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? "Could not update access."); return; }
    setMessage("Staff access updated."); await load();
  }

  async function disableMembership(membershipId: string, email: string) {
    if (!window.confirm(`Disable ${email}'s access to this school? Their SkulGo account will remain available.`)) return;
    setMessage("");
    const response = await fetch(`/api/schools/${schoolId}/settings/staff`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ membershipId }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? "Could not disable school access."); return; }
    setMessage("School membership disabled. The personal SkulGo account remains intact."); await load();
  }

  return <section style={{ marginTop: 28, border: "1px solid #dfe5e1", borderRadius: 16, padding: 20 }}>
    <h2 style={{ margin: 0 }}>Staff & access</h2>
    <p style={{ color: "#53615a", lineHeight: 1.5 }}>School access is controlled here. Disabling a membership removes this school's access without deleting the person's SkulGo account.</p>
    {canManage ? <form onSubmit={createStaff} style={{ display: "grid", gap: 10, marginTop: 16 }}>
      <strong>Add staff account</strong>
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="staff@example.com" required style={{ padding: 11 }} />
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={12} placeholder="Temporary/initial password (12+ characters)" required style={{ padding: 11 }} />
      <div><strong>Capabilities</strong><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8, marginTop: 8 }}>{CAPABILITIES.map((code) => <label key={code}><input type="checkbox" checked={selected.includes(code)} onChange={() => toggle(code)} /> {label(code)}</label>)}</div></div>
      <button type="submit" style={{ padding: 10, width: "fit-content" }}>Create staff account</button>
    </form> : <p style={{ color: "#53615a" }}>Only the school owner can manage staff accounts and access.</p>}

    {message && <p style={{ marginTop: 12 }}>{message}</p>}
    <div style={{ marginTop: 22 }}>
      <strong>Current staff</strong>
      {loading ? <p>Loading…</p> : staff.length === 0 ? <p>No active school staff memberships.</p> : staff.map((member) => <StaffRow key={member.id} member={member} canManage={canManage} onSave={saveAccess} onDisable={disableMembership} />)}
    </div>
  </section>;
}

function StaffRow({ member, canManage, onSave, onDisable }: { member: any; canManage: boolean; onSave: (id: string, codes: string[]) => Promise<void>; onDisable: (id: string, email: string) => Promise<void> }) {
  const [codes, setCodes] = useState<string[]>(member.capabilities.map((item: any) => item.capability.code));
  function toggle(code: string) { setCodes((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]); }
  return <div style={{ borderTop: "1px solid #e7ebe8", padding: "14px 0" }}>
    <div><strong>{member.user.email}</strong>{member.isOwner && <span> · Owner</span>}</div>
    {!member.isOwner && <><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 6, margin: "10px 0" }}>{CAPABILITIES.map((code) => <label key={code}><input type="checkbox" disabled={!canManage} checked={codes.includes(code)} onChange={() => toggle(code)} /> {label(code)}</label>)}</div>{canManage && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button onClick={() => void onSave(member.id, codes)} style={{ padding: "8px 12px" }}>Save access</button><button onClick={() => void onDisable(member.id, member.user.email)} style={{ padding: "8px 12px" }}>Disable school access</button></div>}</>}
  </div>;
}
