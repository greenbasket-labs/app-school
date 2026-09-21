"use client";

import { useEffect, useMemo, useState } from "react";

type Assignment = {
  id: string;
  academicSession: { id: string; name: string };
  academicTerm: { id: string; name: string };
  classArm: { id: string; name: string; classLevel: { name: string } };
  subject: { id: string; name: string };
};

type Teacher = { id: string; user: { email: string }; teacherAssignments: Assignment[] };
type Session = { id: string; name: string; status: string; terms: { id: string; name: string; order: number }[] };
type ClassLevel = { id: string; name: string; order: number; arms: { id: string; name: string }[] };
type Subject = { id: string; name: string; code: string | null };
type ClassSubject = { academicSessionId: string; classArmId: string; subjectId: string };

export default function TeacherAssignmentsSettings({ schoolId, canManage }: { schoolId: string; canManage: boolean }) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [termId, setTermId] = useState("");
  const [classArmId, setClassArmId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch(`/api/schools/${schoolId}/teacher-assignments`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? data.error ?? "Could not load teacher assignments.");
    setTeachers(data.teachers ?? []);
    setSessions(data.sessions ?? []);
    setClassLevels(data.classLevels ?? []);
    setSubjects(data.subjects ?? []);
    setClassSubjects(data.classSubjects ?? []);
  }

  useEffect(() => {
    if (!canManage) return;
    load().catch((e) => setError(e instanceof Error ? e.message : "Could not load teacher assignments."));
  }, [schoolId, canManage]);

  useEffect(() => {
    if (!sessionId) {
      setTermId("");
      return;
    }
    const session = sessions.find((item) => item.id === sessionId);
    setTermId(session?.terms[0]?.id ?? "");
  }, [sessionId, sessions]);

  useEffect(() => {
    if (!classArmId) {
      setSubjectId("");
      return;
    }
    const allowed = classSubjects.filter((item) => item.academicSessionId === sessionId && item.classArmId === classArmId).map((item) => item.subjectId);
    const first = subjects.find((item) => allowed.includes(item.id));
    setSubjectId(first?.id ?? "");
  }, [sessionId, classArmId, classSubjects, subjects]);

  const arms = useMemo(() => classLevels.flatMap((level) => level.arms.map((arm) => ({ ...arm, classLevelName: level.name }))), [classLevels]);
  const allowedSubjectIds = useMemo(
    () => new Set(classSubjects.filter((item) => item.academicSessionId === sessionId && item.classArmId === classArmId).map((item) => item.subjectId)),
    [classSubjects, sessionId, classArmId],
  );
  const allowedSubjects = subjects.filter((subject) => allowedSubjectIds.has(subject.id));

  async function createAssignment() {
    setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch(`/api/schools/${schoolId}/teacher-assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId: teacherId, academicSessionId: sessionId, academicTermId: termId, classArmId, subjectId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? data.error ?? "Could not create teacher assignment.");
      setMessage("Teacher assignment created.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create teacher assignment.");
    } finally {
      setBusy(false);
    }
  }

  async function endAssignment(assignmentId: string) {
    if (!window.confirm("End this teacher assignment? The historical assignment record will remain.")) return;
    setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch(`/api/schools/${schoolId}/teacher-assignments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? data.error ?? "Could not end teacher assignment.");
      setMessage("Teacher assignment ended.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not end teacher assignment.");
    } finally {
      setBusy(false);
    }
  }

  if (!canManage) {
    return <section style={card}><h2 style={{ marginTop: 0 }}>Teacher assignments</h2><p style={sub}>Only the school owner can create or end teacher assignments.</p></section>;
  }

  return <section style={card}>
    <h2 style={{ margin: 0 }}>Teacher assignments</h2>
    <p style={sub}>Assign a teacher to a class, subject and academic term. Assignments are school-controlled and remain auditable when ended.</p>

    {message && <div role="status" style={success}>{message}</div>}
    {error && <div role="alert" style={errorBox}>{error}</div>}

    <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
      <label style={field}>Teacher
        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} style={input}>
          <option value="">Select teacher</option>
          {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.user.email}</option>)}
        </select>
      </label>
      <label style={field}>Academic session
        <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} style={input}>
          <option value="">Select session</option>
          {sessions.map((session) => <option key={session.id} value={session.id}>{session.name} · {session.status}</option>)}
        </select>
      </label>
      <label style={field}>Academic term
        <select value={termId} onChange={(e) => setTermId(e.target.value)} disabled={!sessionId} style={input}>
          <option value="">Select term</option>
          {(sessions.find((session) => session.id === sessionId)?.terms ?? []).map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
        </select>
      </label>
      <label style={field}>Class
        <select value={classArmId} onChange={(e) => setClassArmId(e.target.value)} style={input}>
          <option value="">Select class</option>
          {arms.map((arm) => <option key={arm.id} value={arm.id}>{arm.classLevelName} {arm.name}</option>)}
        </select>
      </label>
      <label style={field}>Subject
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!classArmId || !sessionId} style={input}>
          <option value="">{classArmId && sessionId ? "Select subject configured for this class" : "Select class and session first"}</option>
          {allowedSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}{subject.code ? ` · ${subject.code}` : ""}</option>)}
        </select>
      </label>
      <button type="button" disabled={busy || !teacherId || !sessionId || !termId || !classArmId || !subjectId} onClick={() => void createAssignment()} style={button}>{busy ? "Saving…" : "Create assignment"}</button>
    </div>

    <div style={{ marginTop: 28 }}>
      <h3 style={{ marginBottom: 8 }}>Active assignments</h3>
      {teachers.length === 0 ? <p style={sub}>No active teachers are currently connected to this school.</p> : teachers.map((teacher) => (
        <div key={teacher.id} style={teacherCard}>
          <strong>{teacher.user.email}</strong>
          {teacher.teacherAssignments.length === 0 ? <p style={sub}>No active assignments.</p> : teacher.teacherAssignments.map((assignment) => (
            <div key={assignment.id} style={assignmentCard}>
              <div><strong>{assignment.classArm.classLevel.name} {assignment.classArm.name} · {assignment.subject.name}</strong><div style={sub}>{assignment.academicSession.name} · {assignment.academicTerm.name}</div></div>
              <button type="button" disabled={busy} onClick={() => void endAssignment(assignment.id)} style={endButton}>End assignment</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  </section>;
}

const card = { marginTop: 24, border: "1px solid #dfe5e1", borderRadius: 16, padding: 20 };
const teacherCard = { marginTop: 10, padding: 16, border: "1px solid #e0e6e2", borderRadius: 12 };
const assignmentCard = { marginTop: 10, padding: 14, borderRadius: 10, background: "#f8faf8", display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const };
const field = { display: "grid", gap: 6 };
const input = { padding: 10, border: "1px solid #d8e0db", borderRadius: 9 };
const button = { padding: "10px 14px", border: 0, borderRadius: 9, cursor: "pointer", fontWeight: 700 };
const endButton = { ...button, background: "#fff1f1" };
const sub = { margin: "6px 0 0", color: "#53615a", lineHeight: 1.5 };
const success = { marginTop: 14, padding: 12, borderRadius: 10, background: "#eef8f0" };
const errorBox = { marginTop: 14, padding: 12, borderRadius: 10, background: "#fff1f1" };
