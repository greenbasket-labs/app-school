"use client";

import { useMemo, useState } from "react";

type Assessment = {
  id: string;
  name: string;
  maxScore: number;
  academicSession: { id: string; name: string };
  academicTerm: { id: string; name: string; order: number };
  classArm: { id: string; name: string; classLevel: { name: string } };
  subject: { id: string; name: string; code: string | null };
};

type Options = {
  sessions: Array<{ id: string; name: string; status: string; terms: Array<{ id: string; name: string; order: number }> }>;
  classArms: Array<{ id: string; name: string; classLevel: { id: string; name: string; order: number } }>;
  subjects: Array<{ id: string; name: string; code: string | null }>;
};

export default function AssessmentWorkspace({ schoolId, initialAssessments, options }: { schoolId: string; initialAssessments: Assessment[]; options: Options }) {
  const [assessments, setAssessments] = useState(initialAssessments);
  const firstSession = options.sessions[0];
  const [sessionId, setSessionId] = useState(firstSession?.id ?? "");
  const [termId, setTermId] = useState(firstSession?.terms[0]?.id ?? "");
  const [classArmId, setClassArmId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [name, setName] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedSession = options.sessions.find((session) => session.id === sessionId);
  const terms = selectedSession?.terms ?? [];

  const selectedClassArm = options.classArms.find((arm) => arm.id === classArmId);
  const selectedSubject = options.subjects.find((subject) => subject.id === subjectId);

  const visibleAssessments = useMemo(() => assessments, [assessments]);

  function changeSession(value: string) {
    const next = options.sessions.find((session) => session.id === value);
    setSessionId(value);
    setTermId(next?.terms[0]?.id ?? "");
  }

  async function createAssessment() {
    setMessage("");
    if (!sessionId || !termId || !classArmId || !subjectId || !name.trim()) {
      setMessage("Complete session, term, class, subject and assessment name.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/schools/${schoolId}/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academicSessionId: sessionId, academicTermId: termId, classArmId, subjectId, name, maxScore: Number(maxScore) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Could not create assessment.");
      setAssessments((current) => [...current, data.assessment]);
      setName("");
      setMessage("Assessment definition created and audited.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create assessment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 24, display: "grid", gap: 24 }}>
      <section style={{ border: "1px solid #dce3df", borderRadius: 16, padding: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Define assessment</h2>
        <p style={{ color: "#53615a", marginTop: 6 }}>This creates the definition that future score records will attach to.</p>
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
          <label>Academic session<select value={sessionId} onChange={(event) => changeSession(event.target.value)} style={inputStyle}>{options.sessions.map((session) => <option key={session.id} value={session.id}>{session.name} · {session.status}</option>)}</select></label>
          <label>Term<select value={termId} onChange={(event) => setTermId(event.target.value)} style={inputStyle}>{terms.map((term) => <option key={term.id} value={term.id}>{term.order}. {term.name}</option>)}</select></label>
          <label>Class arm<select value={classArmId} onChange={(event) => setClassArmId(event.target.value)} style={inputStyle}><option value="">Select class</option>{options.classArms.map((arm) => <option key={arm.id} value={arm.id}>{arm.classLevel.name} · {arm.name}</option>)}</select></label>
          <label>Subject<select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} style={inputStyle}><option value="">Select subject</option>{options.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}{subject.code ? ` (${subject.code})` : ""}</option>)}</select></label>
          <label>Assessment name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. First CA" maxLength={100} style={inputStyle} /></label>
          <label>Maximum score<input value={maxScore} onChange={(event) => setMaxScore(event.target.value)} inputMode="decimal" type="number" min="0.01" max="10000" step="0.01" style={inputStyle} /></label>
        </div>
        <button onClick={createAssessment} disabled={saving} style={buttonStyle}>{saving ? "Saving…" : "Create assessment"}</button>
        {message ? <p style={{ marginBottom: 0, color: message.includes("created") ? "#23633d" : "#8a3d2f" }}>{message}</p> : null}
        {selectedClassArm && selectedSubject ? <p style={{ color: "#53615a", fontSize: 13 }}>Will define <strong>{name || "this assessment"}</strong> for {selectedClassArm.classLevel.name} {selectedClassArm.name} · {selectedSubject.name}.</p> : null}
      </section>

      <section style={{ border: "1px solid #dce3df", borderRadius: 16, padding: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Defined assessments</h2>
        {visibleAssessments.length === 0 ? <p style={{ color: "#53615a" }}>No assessment definitions yet.</p> : (
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {visibleAssessments.map((assessment) => (
              <div key={assessment.id} style={{ border: "1px solid #e5e9e7", borderRadius: 12, padding: 14 }}>
                <strong>{assessment.name}</strong>
                <div style={{ color: "#53615a", marginTop: 4 }}>{assessment.academicSession.name} · {assessment.academicTerm.name} · {assessment.classArm.classLevel.name} {assessment.classArm.name} · {assessment.subject.name} · Max {assessment.maxScore}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const inputStyle: React.CSSProperties = { display: "block", width: "100%", marginTop: 6, padding: "10px 12px", border: "1px solid #ccd5d0", borderRadius: 10, background: "white" };
const buttonStyle: React.CSSProperties = { marginTop: 18, padding: "11px 16px", border: 0, borderRadius: 10, background: "#183c2a", color: "white", fontWeight: 700, cursor: "pointer" };
