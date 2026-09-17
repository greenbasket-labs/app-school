"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { SCHOOL_RELATIONSHIPS } from "@/domain/school-join/service";

type School = { id: string; name: string; organizationName: string; status: string };
type JoinRequest = {
  id: string;
  schoolId: string;
  requestedRelationship: string;
  status: string;
  school: { id: string; name: string; status: string };
};

export default function JoinSchoolPage() {
  const [query, setQuery] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [relationship, setRelationship] = useState<string>(SCHOOL_RELATIONSHIPS[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadRequests() {
    const response = await fetch("/api/schools/join-requests", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setRequests(data.requests ?? []);
  }

  async function searchSchools(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    if (!query.trim()) {
      setSchools([]);
      return;
    }
    const response = await fetch(`/api/schools/discover?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Unable to search schools.");
      return;
    }
    setSchools(data.schools ?? []);
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  async function submitRequest(event: FormEvent) {
    event.preventDefault();
    if (!selectedSchool) return;
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/schools/${selectedSchool.id}/join-requests`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestedRelationship: relationship, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to submit join request.");
      setSelectedSchool(null);
      setMessage("");
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit join request.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelRequest(requestId: string) {
    setError("");
    const response = await fetch("/api/schools/join-requests", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Unable to cancel request.");
      return;
    }
    await loadRequests();
  }

  const pendingForSchool = selectedSchool
    ? requests.find((request) => request.schoolId === selectedSchool.id && request.status === "PENDING")
    : null;

  return (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <Link href="/app" style={{ color: "#53615a" }}>← Account</Link>
        <h1 style={{ margin: "18px 0 8px", fontSize: 36 }}>Join a school</h1>
        <p style={{ color: "#53615a", lineHeight: 1.6 }}>Find your school and send a request. The school owner decides the final relationship and access.</p>

        <form onSubmit={searchSchools} style={{ marginTop: 24, display: "flex", gap: 10 }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by school name" aria-label="School name" style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #ccd6d0" }} />
          <button type="submit" style={{ padding: "12px 16px", border: 0, borderRadius: 10, background: "#173d2a", color: "white", fontWeight: 700 }}>Search</button>
        </form>

        {error && <p role="alert" style={{ color: "#a32929", marginTop: 16 }}>{error}</p>}

        <section style={{ marginTop: 24, display: "grid", gap: 12 }}>
          {schools.map((school) => {
            const pending = requests.find((request) => request.schoolId === school.id && request.status === "PENDING");
            return (
              <div key={school.id} style={{ background: "white", borderRadius: 14, padding: 18, boxShadow: "0 8px 24px rgba(0,0,0,.05)" }}>
                <strong>{school.name}</strong>
                <p style={{ margin: "6px 0 0", color: "#53615a" }}>{school.organizationName}</p>
                {pending ? (
                  <p style={{ margin: "12px 0 0", color: "#765b13" }}>Pending {pending.requestedRelationship.toLowerCase()} request.</p>
                ) : (
                  <button onClick={() => setSelectedSchool(school)} style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, border: "1px solid #ccd6d0", background: "white", fontWeight: 700 }}>Request to join</button>
                )}
              </div>
            );
          })}
          {!schools.length && query.trim() && <p style={{ color: "#53615a" }}>No available schools matched that search.</p>}
        </section>

        {selectedSchool && (
          <div style={{ marginTop: 28, background: "white", borderRadius: 16, padding: 24, boxShadow: "0 8px 24px rgba(0,0,0,.05)" }}>
            <h2 style={{ margin: 0 }}>Request access to {selectedSchool.name}</h2>
            {pendingForSchool ? (
              <p style={{ color: "#765b13" }}>You already have a pending request for this school.</p>
            ) : (
              <form onSubmit={submitRequest}>
                <label style={{ display: "block", marginTop: 20, fontWeight: 700 }}>
                  Requested relationship
                  <select value={relationship} onChange={(e) => setRelationship(e.target.value)} style={{ display: "block", width: "100%", marginTop: 8, padding: 12, borderRadius: 10, border: "1px solid #ccd6d0" }}>
                    {SCHOOL_RELATIONSHIPS.map((item) => <option key={item} value={item}>{item.charAt(0) + item.slice(1).toLowerCase()}</option>)}
                  </select>
                </label>
                <label style={{ display: "block", marginTop: 16, fontWeight: 700 }}>
                  Message (optional)
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={4} style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 8, padding: 12, borderRadius: 10, border: "1px solid #ccd6d0" }} />
                </label>
                <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                  <button disabled={busy} type="submit" style={{ padding: "12px 16px", border: 0, borderRadius: 10, background: "#173d2a", color: "white", fontWeight: 700 }}>{busy ? "Sending…" : "Send request"}</button>
                  <button type="button" onClick={() => setSelectedSchool(null)} style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid #ccd6d0", background: "white" }}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        )}

        <section style={{ marginTop: 36 }}>
          <h2>My requests</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {requests.map((request) => (
              <div key={request.id} style={{ background: "white", borderRadius: 14, padding: 18 }}>
                <strong>{request.school.name}</strong>
                <p style={{ margin: "6px 0 0", color: "#53615a" }}>{request.requestedRelationship.toLowerCase()} · {request.status.toLowerCase()}</p>
                {request.status === "PENDING" && <button onClick={() => cancelRequest(request.id)} style={{ marginTop: 10, padding: "9px 12px", borderRadius: 10, border: "1px solid #ccd6d0", background: "white" }}>Cancel request</button>}
              </div>
            ))}
            {!requests.length && <p style={{ color: "#53615a" }}>No school requests yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
