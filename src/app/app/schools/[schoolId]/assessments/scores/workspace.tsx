"use client";

import { useEffect, useMemo, useState } from "react";
import { localRecordId } from "@/domain/platform/client-operation";
import { getLocalRecordByEntity, listLocalRecords, saveLocalMutation } from "@/domain/platform/local-repository";
import { syncLifecycleLabel, syncLifecycleFromLocalState } from "@/domain/platform/sync-state";

type Assessment = {
  id: string; name: string; maxScore: number;
  academicSession: { id: string; name: string };
  academicTerm: { id: string; name: string; order: number };
  classArm: { id: string; name: string; classLevel: { name: string } };
  subject: { id: string; name: string; code: string | null };
};
type RosterStudent = { studentId: string; admissionNumber: string; firstName: string; middleName: string | null; lastName: string; score: number | null };
type LocalRosterStudent = RosterStudent & { assessmentId: string };
type RosterResponse = { assessment: { id: string; name: string; maxScore: number }; students: RosterStudent[] };
type LocalScore = { assessmentId: string; studentId: string; score: number };

type StudentState = "DRAFT" | "SAVED_LOCAL" | "PENDING_SYNC" | "SYNCED" | "FAILED" | "CONFLICT";

export default function ScoreCaptureWorkspace({ schoolId, assessments, initialAssessmentId }: { schoolId: string; assessments: Assessment[]; initialAssessmentId: string }) {
  const [assessmentId, setAssessmentId] = useState(initialAssessmentId);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [maxScore, setMaxScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [states, setStates] = useState<Record<string, StudentState>>({});
  const selectedAssessment = useMemo(() => assessments.find((assessment) => assessment.id === assessmentId), [assessments, assessmentId]);

  useEffect(() => {
    if (!assessmentId) return;
    let cancelled = false;
    setLoading(true); setMessage(""); setSubmitted(false); setStates({});

    const loadFromLocal = async () => {
      const rosterRows = await listLocalRecords<LocalRosterStudent>(schoolId, "AssessmentRosterStudent");
      const matching = rosterRows.filter((row) => row.data.assessmentId === assessmentId).map((row) => row.data);
      if (matching.length === 0) throw new Error("No saved local roster is available for this assessment while offline.");
      const scoreRows = await listLocalRecords<LocalScore>(schoolId, "AssessmentScore");
      const scoreByStudent = new Map(scoreRows.filter((row) => row.data.assessmentId === assessmentId).map((row) => [row.data.studentId, row]));
      return {
        assessment: { id: assessmentId, name: selectedAssessment?.name ?? "Assessment", maxScore: selectedAssessment?.maxScore ?? 0 },
        students: matching.map((student) => ({ ...student, score: scoreByStudent.get(student.studentId)?.data.score ?? student.score ?? null })),
        states: Object.fromEntries(scoreByStudent.entries().map(([studentId, row]) => [studentId, syncLifecycleFromLocalState(row.syncState) as StudentState])),
      };
    };

    const load = async () => {
      try {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          return await loadFromLocal();
        }
        const response = await fetch(`/api/schools/${schoolId}/assessments/scores?assessmentId=${encodeURIComponent(assessmentId)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message ?? "Could not load the class roster.");
        return { ...data as RosterResponse, states: {} as Record<string, StudentState> };
      } catch (error) {
        return await loadFromLocal().catch(() => { throw error; });
      }
    };

    load().then((data) => {
      if (cancelled) return;
      setStudents(data.students);
      setMaxScore(data.assessment.maxScore);
      setDrafts(Object.fromEntries(data.students.map((student) => [student.studentId, student.score == null ? "" : String(student.score)])));
      setStates(data.states);
    }).catch((error) => { if (!cancelled) setMessage(error instanceof Error ? error.message : "Could not load the class roster."); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [assessmentId, schoolId, selectedAssessment]);

  async function saveScore(studentId: string) {
    setSavingStudentId(studentId); setMessage("");
    const raw = drafts[studentId]?.trim() ?? "";
    if (!raw) { setMessage("Enter a score before saving."); setSavingStudentId(null); return; }
    const score = Number(raw);
    if (!Number.isFinite(score) || score < 0 || score > maxScore) { setMessage(`Score must be between 0 and ${maxScore}.`); setSavingStudentId(null); return; }

    const operationId = `assessment.score:${schoolId}:${assessmentId}:${studentId}`;
    const recordId = localRecordId(schoolId, "AssessmentScore", `${assessmentId}:${studentId}`);

    try {
      await saveLocalMutation<LocalScore>({
        schoolId,
        entityType: "AssessmentScore",
        entityId: `${assessmentId}:${studentId}`,
        operationType: "UPSERT",
        payload: { assessmentId, studentId, score },
        operationId,
        record: { id: recordId, schoolId, entityType: "AssessmentScore", entityId: `${assessmentId}:${studentId}`, data: { assessmentId, studentId, score }, syncState: "PENDING_SYNC" },
      });

      setStudents((current) => current.map((student) => student.studentId === studentId ? { ...student, score } : student));
      setStates((current) => ({ ...current, [studentId]: "PENDING_SYNC" }));
      setMessage("Score saved locally and queued for synchronization.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save score locally.");
    } finally {
      setSavingStudentId(null);
    }
  }

  async function submitResult() {
    setSubmitting(true); setMessage("");
    try {
      const response = await fetch(`/api/schools/${schoolId}/assessments/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assessmentId }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message ?? "Could not submit result.");
      setSubmitted(true); setMessage("Result submitted. Score editing is now locked.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not submit result."); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ marginTop: 24, display: "grid", gap: 20 }}>
      <section style={{ border: "1px solid #dce3df", borderRadius: 16, padding: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Capture scores</h2>
        <p style={{ color: "#53615a", marginTop: 6 }}>Scores are recorded against active students in the assessment&apos;s class and academic session.</p>
        <label>Assessment<select value={assessmentId} onChange={(event) => setAssessmentId(event.target.value)} style={inputStyle} disabled={submitted}>
          <option value="">Select assessment</option>
          {assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.name} · {assessment.classArm.classLevel.name} {assessment.classArm.name} · {assessment.subject.name} · Max {assessment.maxScore}</option>)}
        </select></label>
        {selectedAssessment ? <p style={{ color: "#53615a", fontSize: 13 }}>{selectedAssessment.academicSession.name} · {selectedAssessment.academicTerm.name} · Maximum {maxScore}</p> : null}
      </section>
      <section style={{ border: "1px solid #dce3df", borderRadius: 16, padding: 20 }}>
        {loading ? <p>Loading class roster…</p> : students.length === 0 ? <p style={{ color: "#53615a" }}>No active enrolled students found for this assessment.</p> : <div style={{ display: "grid", gap: 10 }}>{students.map((student, index) => {
          const state = states[student.studentId] ?? (student.score == null ? "DRAFT" : "SYNCED");
          return <div key={student.studentId} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 120px auto auto", gap: 10, alignItems: "end", borderBottom: index === students.length - 1 ? 0 : "1px solid #edf0ee", paddingBottom: index === students.length - 1 ? 0 : 10 }}>
            <div><strong>{student.lastName} {student.firstName} {student.middleName ?? ""}</strong><div style={{ color: "#53615a", fontSize: 12 }}>{student.admissionNumber}</div></div>
            <input disabled={submitted} value={drafts[student.studentId] ?? ""} onChange={(event) => { setDrafts((current) => ({ ...current, [student.studentId]: event.target.value })); setStates((current) => ({ ...current, [student.studentId]: "DRAFT" })); }} inputMode="decimal" type="number" min="0" max={maxScore} step="0.01" placeholder={`0–${maxScore}`} style={inputStyle} aria-label={`Score for ${student.firstName} ${student.lastName}`} />
            <button onClick={() => saveScore(student.studentId)} disabled={submitted || savingStudentId === student.studentId} style={buttonStyle}>{savingStudentId === student.studentId ? "Saving…" : state === "PENDING_SYNC" ? "Saved ✓" : "Save"}</button>
            <span style={{ color: "#53615a", fontSize: 12, minWidth: 86 }}>{syncLifecycleLabel[state === "SAVED_LOCAL" ? "PENDING_SYNC" : state]}</span>
          </div>;
        })}</div>}
        {!submitted && students.length > 0 ? <button onClick={submitResult} disabled={submitting} style={{ ...buttonStyle, marginTop: 18 }}>{submitting ? "Submitting…" : "Submit result"}</button> : null}
        {submitted ? <p style={{ marginBottom: 0, color: "#23633d" }}>Submitted and locked. The next workflow is result approval.</p> : null}
        {message ? <p style={{ marginBottom: 0, color: message.includes("saved") || message.includes("submitted") ? "#23633d" : "#8a3d2f" }}>{message}</p> : null}
      </section>
    </div>
  );
}

const inputStyle: React.CSSProperties = { display: "block", width: "100%", marginTop: 6, padding: "10px 12px", border: "1px solid #ccd5d0", borderRadius: 10, background: "white", boxSizing: "border-box" };
const buttonStyle: React.CSSProperties = { padding: "10px 14px", border: 0, borderRadius: 10, background: "#183c2a", color: "white", fontWeight: 700, cursor: "pointer" };