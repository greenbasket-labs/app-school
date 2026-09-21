"use client";

import { useState } from "react";

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

function label(code: string) {
  return code.replaceAll(".", " · ").replaceAll("_", " ");
}

export default function WorkerRequestReview({
  schoolId,
  requestId,
  requestedRelationship,
  requestedCapabilities,
}: {
  schoolId: string;
  requestId: string;
  requestedRelationship: string;
  requestedCapabilities: string[];
}) {
  const [relationship, setRelationship] = useState(requestedRelationship);
  const [codes, setCodes] = useState<string[]>(requestedCapabilities.map(String));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function toggle(code: string) {
    setCodes((current) =>
      current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code],
    );
  }

  async function review(decision: "APPROVE" | "REJECT") {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/schools/${schoolId}/settings/join-requests`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId,
            decision,
            relationship: decision === "APPROVE" ? relationship : undefined,
            capabilityCodes: decision === "APPROVE" ? codes : undefined,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Could not review join request.");
        return;
      }

      setMessage(
        decision === "APPROVE"
          ? "Join request approved and school access activated."
          : "Join request rejected.",
      );

      window.setTimeout(() => window.location.reload(), 500);
    } catch {
      setMessage("Could not review join request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 18, borderTop: "1px solid #e7ebe8", paddingTop: 16 }}>
      <strong>Owner review</strong>

      <label style={{ display: "block", marginTop: 12, fontWeight: 700 }}>
        Authoritative relationship
        <select
          value={relationship}
          disabled={busy}
          onChange={(event) => setRelationship(event.target.value)}
          style={{ display: "block", marginTop: 6, padding: 10, borderRadius: 8 }}
        >
          {RELATIONSHIPS.map((item) => (
            <option key={item} value={item}>
              {item.charAt(0) + item.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </label>

      <div style={{ marginTop: 12 }}>
        <strong>Capabilities</strong>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 6, marginTop: 8 }}>
          {CAPABILITIES.map((code) => (
            <label key={code}>
              <input
                type="checkbox"
                disabled={busy}
                checked={codes.includes(code)}
                onChange={() => toggle(code)}
              />{" "}
              {label(code)}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <button
          disabled={busy}
          onClick={() => void review("APPROVE")}
          style={{ padding: "9px 12px" }}
        >
          {busy ? "Processing..." : "Approve & activate"}
        </button>
        <button
          disabled={busy}
          onClick={() => void review("REJECT")}
          style={{ padding: "9px 12px" }}
        >
          Reject
        </button>
      </div>

      {message ? (
        <p role="status" style={{ marginTop: 12 }}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
