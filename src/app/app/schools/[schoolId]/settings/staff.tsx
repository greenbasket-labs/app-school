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

const RELATIONSHIPS = ["STUDENT", "TEACHER", "STAFF", "CASHIER"];

function label(code: string) { return code.replaceAll(".", " · ").replaceAll("_", " "); }

export default function StaffSettings({ schoolId, canManage }: { schoolId: string; canManage: boolean }) {
  const [staff, setStaff] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const [staffResponse, requestResponse] = await Promise.all([
      fetch(`/api/schools/${schoolId}/settings/staff`, { cache: "no-store" }),
      fetch(`/api/schools/${schoolId}/settings/join-requests?status=PENDING`, { cache: "no-store" }),
    ]);
    const staffData = await staffResponse.json();
    const requestData = await requestResponse.json();
    if (staffResponse.ok) setStaff(staffData.staff ?? []);
    if (requestResponse.ok) setRequests(requestData.requests ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [schoolId]);

  async function reviewRequest(requestId: string, decision: "APPROVE" | "REJECT", relationship?: string, capabilityCodes?: string[]) {
    setMessage("");
    const response = await fetch(`/api/schools/${schoolId}/settings/join-requests`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, decision, relationship, capabilityCodes }),
    });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? "Could not review join request."); return; }
    setMessage(decision === "APPROVE" ? "Join request approved and school access activated." : "Join request rejected.");
    await load();
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
    <p style={{ color: "#53615a", lineHeight: 1.5 }}>School access is controlled here. People first create their own SkulGo account and request a school relationship; the owner approves the actual relationship and capabilities.</p>

    {canManage && <div style={{ marginTop: 22 }}>
      <strong>Pending join requests</strong>
      {loading ? <p>Loading…</p> : requests.length === 0 ? <p>No pending join requests.</p> : requests.map((request) => <JoinRequestRow key={request.id} request={request} onReview={reviewRequest} />)}
    </div>}
    {!canManage && <p style={{ color: "#53615a" }}>Only the school owner can review join requests and manage access.</p>}

    {message && <p role="status" style={{ marginTop: 12 }}>{message}</p>}
    <div style={{ marginTop: 22 }}>
      <strong>Current staff</strong>
      {loading ? <p>Loading…</p> : staff.length === 0 ? <p>No active school staff memberships.</p> : staff.map((member) => <StaffRow key={member.id} member={member} canManage={canManage} onSave={saveAccess} onDisable={disableMembership} />)}
    </div>
  </section>;
}

function JoinRequestRow({ request, onReview }: { request: any; onReview: (requestId: string, decision: "APPROVE" | "REJECT", relationship?: string, capabilityCodes?: string[]) => Promise<void> }) {
  const [relationship, setRelationship] = useState(request.requestedRelationship);
  const [codes, setCodes] = useState<string[]>(request.requestedCapabilities ?? []);

  function toggle(code: string) { setCodes((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]); }

  return <div style={{ borderTop: "1px solid #e7ebe8", padding: "14px 0" }}>
    <div><strong>{request.user.email}</strong></div>
    <div style={{ color: "#53615a", marginTop: 6 }}>Requested: {request.requestedRelationship.toLowerCase()}</div>
    {request.message && <p style={{ margin: "8px 0", color: "#53615a" }}>{request.message}</p>}
    <label style={{ display: "block", marginTop: 10, fontWeight: 700 }}>
      Authoritative relationship
      <select value={relationship} onChange={(e) => setRelationship(e.target.value)} style={{ display: "block", marginTop: 6, padding: 10, borderRadius: 8 }}>
        {RELATIONSHIPS.map((item) => <option key={item} value={item}>{item.charAt(0) + item.slice(1).toLowerCase()}</option>)}
      </select>
    </label>
    <div style={{ marginTop: 10 }}>
      <strong>Capabilities</strong>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 6, marginTop: 8 }}>
        {CAPABILITIES.map((code) => <label key={code}><input type="checkbox" checked={codes.includes(code)} onChange={() => toggle(code)} /> {label(code)}</label>)}
      </div>
    </div>
    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
      <button onClick={() => void onReview(request.id, "APPROVE", relationship, codes)} style={{ padding: "9px 12px" }}>Approve & activate</button>
      <button onClick={() => void onReview(request.id, "REJECT")} style={{ padding: "9px 12px" }}>Reject</button>
    </div>
  </div>;
}

function StaffRow({ member, canManage, onSave, onDisable }: { member: any; canManage: boolean; onSave: (id: string, codes: string[]) => Promise<void>; onDisable: (id: string, email: string) => Promise<void> }) {
  const [codes, setCodes] = useState<string[]>(member.capabilities.map((item: any) => item.capability.code));
  function toggle(code: string) { setCodes((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]); }
  return <div style={{ borderTop: "1px solid #e7ebe8", padding: "14px 0" }}>
    <div><strong>{member.user.email}</strong>{member.isOwner && <span> · Owner</span>}</div>
    {!member.isOwner && <><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 6, margin: "10px 0" }}>{CAPABILITIES.map((code) => <label key={code}><input type="checkbox" disabled={!canManage} checked={codes.includes(code)} onChange={() => toggle(code)} /> {label(code)}</label>)}</div>{canManage && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button onClick={() => void onSave(member.id, codes)} style={{ padding: "8px 12px" }}>Save access</button><button onClick={() => void onDisable(member.id, member.user.email)} style={{ padding: "8px 12px" }}>Disable school access</button></div>}</>}
  </div>;
}
