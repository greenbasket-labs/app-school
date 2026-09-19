"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApproveAdmissionForm({
  schoolId,
  applicationId,
}: {
  schoolId: string;
  applicationId: string;
}) {
  const router = useRouter();

  const [admissionNumber, setAdmissionNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = admissionNumber.trim();

    if (!value) {
      setMessage("Enter an admission number.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/schools/${schoolId}/admissions/${applicationId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "APPROVE",
            admissionNumber: value,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Could not approve this admission.",
        );
      }

      router.push(
        `/app/schools/${schoolId}/students/admissions/${applicationId}`,
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not approve this admission.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 18 }}>
      <input
        required
        value={admissionNumber}
        onChange={(event) => setAdmissionNumber(event.target.value)}
        placeholder="e.g. HIK/2026/001"
        disabled={saving}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "12px 13px",
          border: "1px solid #ccd6d0",
          borderRadius: 9,
          background: "white",
          font: "inherit",
        }}
      />

      {message && (
        <div
          role="alert"
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 9,
            background: "#fff4f2",
            border: "1px solid #f0d5d0",
            color: "#8a3b2f",
            fontSize: 13,
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() =>
            router.push(
              `/app/schools/${schoolId}/students/admissions/${applicationId}`,
            )
          }
          disabled={saving}
          style={{
            border: "1px solid #ccd6d0",
            borderRadius: 9,
            background: "white",
            color: "#173d2a",
            padding: "10px 15px",
            fontWeight: 700,
            cursor: saving ? "default" : "pointer",
          }}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving || !admissionNumber.trim()}
          style={{
            border: 0,
            borderRadius: 9,
            background: saving ? "#8b9a91" : "#173d2a",
            color: "white",
            padding: "10px 15px",
            fontWeight: 800,
            cursor: saving ? "default" : "pointer",
          }}
        >
          {saving ? "Approving…" : "Approve admission"}
        </button>
      </div>

      <p
        style={{
          margin: "12px 0 0",
          fontSize: 12,
          color: "#6b7770",
          lineHeight: 1.5,
        }}
      >
        Approval will create the official student record and enroll the
        student in the requested class.
      </p>
    </form>
  );
}