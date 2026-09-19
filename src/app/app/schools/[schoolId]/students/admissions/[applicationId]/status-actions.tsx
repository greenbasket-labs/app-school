"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdmissionStatusActions({
  schoolId,
  applicationId,
  status,
}: {
  schoolId: string;
  applicationId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function updateStatus(nextStatus: "UNDER_REVIEW" | "REJECTED" | "WITHDRAWN") {
    if (busy) return;

    let rejectionReason: string | undefined;

    if (nextStatus === "REJECTED") {
      const reason = window.prompt("Why is this application being rejected?");
      if (reason === null) return;
      rejectionReason = reason.trim();

      if (!rejectionReason) {
        setMessage("A rejection reason is required.");
        return;
      }
    }

    if (
      nextStatus === "WITHDRAWN" &&
      !window.confirm("Withdraw this admission application?")
    ) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/schools/${schoolId}/admissions/${applicationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: nextStatus,
            ...(rejectionReason ? { rejectionReason } : {}),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Could not update application.",
        );
      }

      router.push(`/app/schools/${schoolId}/students`);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update application.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {status === "PENDING" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => updateStatus("UNDER_REVIEW")}
          style={secondaryButton}
        >
          {busy ? "Updating…" : "Mark under review"}
        </button>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => updateStatus("REJECTED")}
        style={dangerButton}
      >
        Reject
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={() => updateStatus("WITHDRAWN")}
        style={secondaryButton}
      >
        Withdraw
      </button>

      {message && (
        <span
          role="alert"
          style={{
            width: "100%",
            fontSize: 13,
            color: "#8a3b2f",
          }}
        >
          {message}
        </span>
      )}
    </div>
  );
}

const secondaryButton = {
  border: "1px solid #ccd6d0",
  borderRadius: 9,
  background: "white",
  color: "#173d2a",
  padding: "10px 15px",
  fontWeight: 700,
  cursor: "pointer",
};

const dangerButton = {
  border: "1px solid #e5c4bf",
  borderRadius: 9,
  background: "#fff7f5",
  color: "#8a3b2f",
  padding: "10px 15px",
  fontWeight: 700,
  cursor: "pointer",
};
