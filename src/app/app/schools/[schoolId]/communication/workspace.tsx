"use client";

import { useEffect, useState } from "react";

type Recipient = { id: string; isOwner: boolean; user: { email: string } };
type Guardian = { id: string; fullName: string; email: string | null; hasAccount: boolean };
type Notice = { id: string; title: string; body: string; createdAt: string; readAt: string | null; senderEmail: string };

type Props = { schoolId: string; membershipId: string; recipients: Recipient[]; guardians: Guardian[]; isOwner: boolean; canSend: boolean };

export default function CommunicationWorkspace({ schoolId, recipients, guardians, isOwner, canSend }: Props) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [preferences, setPreferences] = useState({ inAppEnabled: true, smsEnabled: false, emailEnabled: false, whatsappEnabled: false });
  const [message, setMessage] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  async function load() {
    const [n, p] = await Promise.all([
      fetch(`/api/schools/${schoolId}/communication/notifications`).then((r) => r.json()),
      fetch(`/api/schools/${schoolId}/settings/notification-preferences`).then((r) => r.json()),
    ]);
    setNotices(n.notifications ?? []);
    if (p.inAppEnabled !== undefined) setPreferences(p);
  }
  useEffect(() => { void load(); }, [schoolId]);

  async function send() {
    setMessage("");
    const response = await fetch(`/api/schools/${schoolId}/communication/notifications`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, body, membershipIds: selected }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error ?? "Could not send notice.");
    setTitle(""); setBody(""); setSelected([]); setMessage("Notice sent in-app."); await load();
  }

  async function savePreferences(next: typeof preferences) {
    setPreferences(next);
    await fetch(`/api/schools/${schoolId}/settings/notification-preferences`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
  }

  async function markRead(id: string) {
    await fetch(`/api/schools/${schoolId}/communication/notifications/read`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notificationId: id }) });
    await load();
  }

  async function inviteParent(guardianId: string) {
    setInviteMessage("");
    const response = await fetch(`/api/schools/${schoolId}/communication/parent-access`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guardianId }) });
    const data = await response.json();
    if (!response.ok) return setInviteMessage(data.error ?? "Could not create parent access.");
    const url = `${window.location.origin}${data.invitePath}`;
    await navigator.clipboard?.writeText(url);
    setInviteMessage(`Parent access link created and copied: ${url}`);
  }

  return <div style={{ marginTop: 24, display: "grid", gap: 20 }}>
    {canSend && <section style={{ border: "1px solid #dfe7e2", borderRadius: 14, padding: 18 }}><h2 style={{ marginTop: 0 }}>Send notice</h2><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notice title" style={{ width: "100%", padding: 11, marginBottom: 10, boxSizing: "border-box" }} /><textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the notice..." rows={4} style={{ width: "100%", padding: 11, boxSizing: "border-box" }} /><p style={{ fontWeight: 700, marginBottom: 8 }}>Recipients</p>{recipients.map((r) => <label key={r.id} style={{ display: "block", margin: "7px 0" }}><input type="checkbox" checked={selected.includes(r.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, r.id] : selected.filter((id) => id !== r.id))} /> {r.user.email}{r.isOwner ? " (Owner)" : ""}</label>)}<button onClick={() => void send()} disabled={!title.trim() || !body.trim() || selected.length === 0} style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "#183c2a", color: "white", border: 0, fontWeight: 700 }}>Send in-app notice</button>{message && <p>{message}</p>}</section>}

    {isOwner && <section style={{ border: "1px solid #dfe7e2", borderRadius: 14, padding: 18 }}><h2 style={{ marginTop: 0 }}>Parent access</h2><p style={{ color: "#53615a" }}>Give an existing guardian an App-School account. They can then receive in-app notices like other school members.</p>{guardians.length === 0 ? <p>No guardians have been added yet.</p> : guardians.map((g) => <div key={g.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", borderTop: "1px solid #edf1ee", padding: "10px 0" }}><div><strong>{g.fullName}</strong><div style={{ color: "#53615a", fontSize: 14 }}>{g.email ?? "No email"}</div></div>{g.hasAccount ? <span>Access active</span> : <button disabled={!g.email} onClick={() => void inviteParent(g.id)}>{g.email ? "Create access link" : "Email required"}</button>}</div>)}{inviteMessage && <p style={{ wordBreak: "break-word" }}>{inviteMessage}</p>}</section>}

    <section style={{ border: "1px solid #dfe7e2", borderRadius: 14, padding: 18 }}><h2 style={{ marginTop: 0 }}>My notification settings</h2><p style={{ color: "#53615a" }}>In-app is available now. Other channels are prepared for future delivery integrations.</p>{([['inAppEnabled','In-app'],['smsEnabled','SMS'],['emailEnabled','Email'],['whatsappEnabled','WhatsApp']] as const).map(([key, label]) => <label key={key} style={{ display: "block", margin: "9px 0" }}><input type="checkbox" checked={preferences[key]} onChange={(e) => void savePreferences({ ...preferences, [key]: e.target.checked })} /> {label}</label>)}</section>

    <section><h2>Inbox</h2>{notices.length === 0 ? <p style={{ color: "#53615a" }}>No notifications yet.</p> : notices.map((n) => <article key={n.id} style={{ border: "1px solid #dfe7e2", borderRadius: 12, padding: 16, marginBottom: 10, background: n.readAt ? "white" : "#f4f8f5" }}><strong>{n.title}</strong><p style={{ whiteSpace: "pre-wrap" }}>{n.body}</p><small>From {n.senderEmail} · {new Date(n.createdAt).toLocaleString()}</small>{!n.readAt && <div><button onClick={() => void markRead(n.id)} style={{ marginTop: 10 }}>Mark as read</button></div>}</article>)}</section>
  </div>;
}
