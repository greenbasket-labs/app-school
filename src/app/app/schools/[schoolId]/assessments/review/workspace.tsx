"use client";

import { useMemo, useState } from "react";

const ACTIONS = {
  SUBMITTED: "assessment.result_submitted",
  APPROVED: "assessment.result_approved",
  PUBLISHED: "assessment.result_published",
} as const;

type Assessment = {
  id: string;
  name: string;
  maxScore: number;
  classArm: { name: string; classLevel: { name: string } };
  subject: { name: string };
  academicSession: { name: string };
  academicTerm: { name: string };
};

type AuditEvent = { entityId: string; action: string; actorUserId: string; occurredAt: string };

type Props = { schoolId: string; assessments: Assessment[]; auditEvents: AuditEvent[] };

function stateFor(events: AuditEvent[]) {
  if (events.some((event) => event.action === ACTIONS.PUBLISHED)) return "PUBLISHED";
  if (events.some((event) => event.action === ACTIONS.APPROVED)) return "APPROVED";
  if (events.some((event) => event.action === ACTIONS.SUBMITTED)) return "SUBMITTED";
  return "DRAFT";
}

export default function ResultReviewWorkspace({ schoolId, assessments, auditEvents: initialAuditEvents }: Props) {
  const [auditEvents, setAuditEvents] = useState(initialAuditEvents);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(() => assessments.map((assessment) => ({ assessment, state: stateFor(auditEvents.filter((event) => event.entityId === assessment.id)) })), [assessments, auditEvents]);

  async function action(assessmentId: string, actionName: "approve" | "publish") {
    setMessage("");
    setBusy(`${actionName}:${assessmentId}`);
    const endpoint = actionName === "approve" ? "approve" : "publish";
    try {
      const response = await fetch(`/api/schools/${schoolId}/assessments/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? `Could not ${actionName} result.`);
      const created = actionName === "approve" ? data.approval : data.publication;
      const eventAction = actionName === "approve" ? ACTIONS.APPROVED : ACTIONS.PUBLISHED;
      const actorUserId = "server-confirmed";
      setAuditEvents((current) => [...current, { entityId: assessmentId, action: eventAction, actorUserId, occurredAt: created[`${actionName}dAt`] ?? new Date().toISOString() }]);
      setMessage(actionName === "approve" ? "Result approved. It is ready for publication." : "Result published and the existing parent notification workflow was triggered.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Could not ${actionName} result.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section style={{ marginTop: 24, border: "1px solid #dce3df", borderRadius: 16, padding: 20 }}>
      {message && <p role="status" style={{ marginTop: 0, color: message.includes("Could not") ? "#8a3d2f" : "#23633d" }}>{message}</p>}
      {rows.length === 0 ? <p style={{ color: "#53615a" }}>No assessments are available for review.</p> : (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map(({ assessment, state }) => (
            <div key={assessment.id} style={{ border: "1px solid #e5e9e7", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <strong>{assessment.name}</strong>
                  <div style={{ marginTop: 5, color: "#53615a", fontSize: 13 }}>{assessment.academicSession.name} · {assessment.academicTerm.name} · {assessment.classArm.classLevel.name} {assessment.classArm.name} · {assessment.subject.name}</div>
                </div>
                <strong>{state}</strong>
              </div>
              {state === "SUBMITTED" && <button onClick={() => void action(assessment.id, "approve")} disabled={busy === `approve:${assessment.id}`} style={buttonStyle}>{busy === `approve:${assessment.id}` ? "Approving…" : "Approve result"}</button>}
              {state === "APPROVED" && <button onClick={() => void action(assessment.id, "publish")} disabled={busy === `publish:${assessment.id}`} style={buttonStyle}>{busy === `publish:${assessment.id}` ? "Publishing…" : "Publish result"}</button>}
              {state === "PUBLISHED" && <p style={{ marginBottom: 0, color: "#23633d" }}>Published result is now in the authoritative published state.</p>}
              {state === "DRAFT" && <p style={{ marginBottom: 0, color: "#53615a" }}>Waiting for the score submitter to submit this result.</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const buttonStyle: React.CSSProperties = { marginTop: 12, padding: "10px 14px", border: 0, borderRadius: 10, background: "#183c2a", color: "white", fontWeight: 700, cursor: "pointer" };
