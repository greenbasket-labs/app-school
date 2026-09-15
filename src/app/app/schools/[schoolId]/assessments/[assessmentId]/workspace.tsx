"use client";

import { useState } from "react";

type RosterRow = {
  enrollmentId: string;
  studentId: string;
  admissionNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  score: number | null;
};

type InitialData = {
  assessment: { maxScore: number };
  students: RosterRow[];
};

function studentName(student: RosterRow) {
  return [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
}

export default function ScoreCaptureWorkspace({ schoolId, assessmentId, initialData }: { schoolId: string; assessmentId: string; initialData: InitialData }) {
  const [students, setStudents] = useState(initialData.students);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function save(studentId: string, rawScore: string) {
    setMessage("");
    if (rawScore.trim() === "") {
      setMessage("Enter a score before saving.");
      return;
    }
    const score = Number(rawScore);
    if (!Number.isFinite(score) || score < 0 || score > initialData.assessment.maxScore) {
      setMessage(`Score must be between 0 and ${initialData.assessment.maxScore}.`);
      return;
    }
    setSaving(studentId);
    try {
      const response = await fetch(`/api/schools/${schoolId}/assessments/${assessmentId}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, score }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Could not save score.");
      setStudents((current) => current.map((student) => student.studentId === studentId ? { ...student, score: data.score.score } : student));
      setMessage("Score saved and audited.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save score.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section style={{ marginTop: 24, border: "1px solid #dce3df", borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Enter scores</h2>
          <p style={{ color: "#53615a", marginTop: 6 }}>Only actively enrolled students in this class and session are shown.</p>
        </div>
        <strong>Max {initialData.assessment.maxScore}</strong>
      </div>
      {students.length === 0 ? <p style={{ color: "#8a3d2f" }}>No active students are enrolled in this class for the selected session.</p> : (
        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
          {students.map((student, index) => (
            <div key={student.studentId} style={{ display: "grid", gridTemplateColumns: "44px minmax(180px, 1fr) 120px 90px", gap: 12, alignItems: "center", borderTop: "1px solid #edf0ee", padding: "10px 0" }}>
              <span style={{ color: "#53615a" }}>{index + 1}</span>
              <div><strong>{studentName(student)}</strong><div style={{ color: "#53615a", fontSize: 12 }}>{student.admissionNumber}</div></div>
              <input aria-label={`Score for ${studentName(student)}`} defaultValue={student.score ?? ""} type="number" min="0" max={initialData.assessment.maxScore} step="0.01" id={`score-${student.studentId}`} style={inputStyle} />
              <button disabled={saving === student.studentId} onClick={() => save(student.studentId, (document.getElementById(`score-${student.studentId}`) as HTMLInputElement).value)} style={buttonStyle}>{saving === student.studentId ? "Saving…" : "Save"}</button>
            </div>
          ))}
        </div>
      )}
      {message ? <p style={{ marginBottom: 0, color: message.includes("saved") ? "#23633d" : "#8a3d2f" }}>{message}</p> : null}
    </section>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 10px", border: "1px solid #ccd5d0", borderRadius: 9, background: "white" };
const buttonStyle: React.CSSProperties = { padding: "9px 10px", border: 0, borderRadius: 9, background: "#183c2a", color: "white", fontWeight: 700, cursor: "pointer" };
