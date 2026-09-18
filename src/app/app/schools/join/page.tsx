"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { SCHOOL_RELATIONSHIPS } from "@/domain/school-join/service";

type School = {
  id: string;
  name: string;
  organizationName: string;
  status: string;
};

type JoinRequest = {
  id: string;
  schoolId: string;
  requestedRelationship: string;
  status: string;
  school: { id: string; name: string; status: string };
};

type AccessType = "WORKER" | "STUDENT" | "PARENT";

export default function JoinSchoolPage() {
  const [accessType, setAccessType] = useState<AccessType>("WORKER");
  const [query, setQuery] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [relationship, setRelationship] = useState<string>(SCHOOL_RELATIONSHIPS[1]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(true);

  async function loadRequests() {
    setLoadingRequests(true);
    try {
      const response = await fetch("/api/schools/join-requests", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load your school requests.");
      setRequests(data.requests ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your school requests.");
    } finally {
      setLoadingRequests(false);
    }
  }

  async function searchSchools(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    if (!query.trim()) {
      setSchools([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/schools/discover?q=${encodeURIComponent(query.trim())}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to search schools.");
      setSchools(data.schools ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to search schools.");
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  useEffect(() => {
    setSelectedSchool(null);
    setMessage("");
    setError("");
  }, [accessType]);

  async function submitWorkerRequest(event: FormEvent) {
    event.preventDefault();
    if (!selectedSchool) return;

    setError("");
    setBusy(true);

    try {
      const response = await fetch(
        `/api/schools/${selectedSchool.id}/join-requests`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            requestedRelationship: relationship,
            message,
          }),
        },
      );
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

    try {
      const response = await fetch("/api/schools/join-requests", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to cancel request.");
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel request.");
    }
  }

  const pendingForSchool = selectedSchool
    ? requests.find(
        (request) =>
          request.schoolId === selectedSchool.id &&
          request.status === "PENDING",
      )
    : null;

  return (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <Link href="/app" style={{ color: "#53615a" }}>
          ← Account
        </Link>

        <h1 style={{ margin: "18px 0 8px", fontSize: 36 }}>Join a school</h1>
        <p style={{ color: "#53615a", lineHeight: 1.6 }}>
          Find your school. The next step depends on your relationship with the
          school.
        </p>

        <section style={{ marginTop: 24 }}>
          <h2 style={{ marginBottom: 12 }}>I am joining as</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {[
              ["WORKER", "Teacher / Staff", "Request to join the school."],
              ["STUDENT", "Student", "Apply for admission."],
              ["PARENT", "Parent / Guardian", "Connect to your child."],
            ].map(([value, title, description]) => (
              <button
                key={value}
                type="button"
                onClick={() => setAccessType(value as AccessType)}
                style={{
                  textAlign: "left",
                  padding: 16,
                  borderRadius: 14,
                  border:
                    accessType === value
                      ? "2px solid #173d2a"
                      : "1px solid #ccd6d0",
                  background: accessType === value ? "#f2f7f3" : "white",
                  cursor: "pointer",
                }}
              >
                <strong>{title}</strong>
                <p style={{ margin: "7px 0 0", color: "#53615a", lineHeight: 1.4 }}>
                  {description}
                </p>
              </button>
            ))}
          </div>
        </section>

        <form onSubmit={searchSchools} style={{ marginTop: 28, display: "flex", gap: 10 }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by school name"
            aria-label="School name"
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ccd6d0",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "12px 16px",
              border: 0,
              borderRadius: 10,
              background: "#173d2a",
              color: "white",
              fontWeight: 700,
            }}
          >
            Search
          </button>
        </form>

        {error && (
          <p role="alert" style={{ color: "#a32929", marginTop: 16 }}>
            {error}
          </p>
        )}

        <section style={{ marginTop: 24, display: "grid", gap: 12 }}>
          {schools.map((school) => {
            const pending = requests.find(
              (request) =>
                request.schoolId === school.id &&
                request.status === "PENDING",
            );

            return (
              <div
                key={school.id}
                style={{
                  background: "white",
                  borderRadius: 14,
                  padding: 18,
                  boxShadow: "0 8px 24px rgba(0,0,0,.05)",
                }}
              >
                <strong>{school.name}</strong>
                <p style={{ margin: "6px 0 0", color: "#53615a" }}>
                  {school.organizationName}
                </p>

                {accessType === "WORKER" ? (
                  pending ? (
                    <p style={{ margin: "12px 0 0", color: "#765b13" }}>
                      Pending {pending.requestedRelationship.toLowerCase()} request.
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedSchool(school)}
                      style={{
                        marginTop: 12,
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #ccd6d0",
                        background: "white",
                        fontWeight: 700,
                      }}
                    >
                      Request to join
                    </button>
                  )
                ) : (
                  <p style={{ margin: "12px 0 0", color: "#53615a" }}>
                    {accessType === "STUDENT"
                      ? "Student admission is handled as an admission application, not a staff join request."
                      : "Parent access is created through a verified child/guardian relationship with the school."}
                  </p>
                )}
              </div>
            );
          })}

          {!schools.length && query.trim() && (
            <p style={{ color: "#53615a" }}>
              No available schools matched that search.
            </p>
          )}
        </section>

        {selectedSchool && accessType === "WORKER" && (
          <div
            style={{
              marginTop: 28,
              background: "white",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 8px 24px rgba(0,0,0,.05)",
            }}
          >
            <h2 style={{ margin: 0 }}>
              Request access to {selectedSchool.name}
            </h2>

            {pendingForSchool ? (
              <p style={{ color: "#765b13" }}>
                You already have a pending request for this school.
              </p>
            ) : (
              <form onSubmit={submitWorkerRequest}>
                <label style={{ display: "block", marginTop: 20, fontWeight: 700 }}>
                  Requested relationship
                  <select
                    aria-label="Requested relationship"
                    value={relationship}
                    onChange={(event) => setRelationship(event.target.value)}
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 8,
                      padding: 12,
                      borderRadius: 10,
                      border: "1px solid #ccd6d0",
                    }}
                  >
                    {SCHOOL_RELATIONSHIPS.filter((item) => item !== "STUDENT").map(
                      (item) => (
                        <option key={item} value={item}>
                          {item.charAt(0) + item.slice(1).toLowerCase()}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label style={{ display: "block", marginTop: 16, fontWeight: 700 }}>
                  Message (optional)
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    maxLength={1000}
                    rows={4}
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

                <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                  <button
                    disabled={busy}
                    type="submit"
                    style={{
                      padding: "12px 16px",
                      border: 0,
                      borderRadius: 10,
                      background: "#173d2a",
                      color: "white",
                      fontWeight: 700,
                    }}
                  >
                    {busy ? "Sending…" : "Send request"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSchool(null)}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "1px solid #ccd6d0",
                      background: "white",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {accessType === "WORKER" && (
          <section style={{ marginTop: 36 }}>
            <h2>My requests</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {loadingRequests ? (
                <p style={{ color: "#53615a" }}>Loading requests…</p>
              ) : (
                <>
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      style={{
                        background: "white",
                        borderRadius: 14,
                        padding: 18,
                      }}
                    >
                      <strong>{request.school.name}</strong>
                      <p style={{ margin: "6px 0 0", color: "#53615a" }}>
                        {request.requestedRelationship.toLowerCase()} ·{" "}
                        {request.status.toLowerCase()}
                      </p>

                      {request.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => cancelRequest(request.id)}
                          style={{
                            marginTop: 10,
                            padding: "9px 12px",
                            borderRadius: 10,
                            border: "1px solid #ccd6d0",
                            background: "white",
                          }}
                        >
                          Cancel request
                        </button>
                      )}
                    </div>
                  ))}

                  {!requests.length && (
                    <p style={{ color: "#53615a" }}>No school requests yet.</p>
                  )}
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
