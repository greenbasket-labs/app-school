"use client";

import { useEffect, useMemo, useState } from "react";
import { listLocalRecords, saveLocalMutation } from "@/domain/platform/local-repository";
import { localRecordId } from "@/domain/platform/client-operation";
import { syncLifecycleLabel } from "@/domain/platform/sync-state";
import { startSyncScheduler } from "@/domain/platform/sync-scheduler";
import { assessmentScoreSyncExecutor } from "@/domain/assessments/score-sync-executor";

type RosterRow = {
  enrollmentId: string;
  studentId: string;
  admissionNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  score: number | null;
  syncState?: "DRAFT" | "PENDING_SYNC" | "SYNCING" | "SYNCED" | "FAILED" | "CONFLICT";
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
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        for (const student of initialData.students) {
          const existing = await listLocalRecords<RosterRow>(schoolId, "AssessmentRosterStudent");
          if (existing.some((record) => record.entityId === student.studentId)) continue;
          await saveLocalMutation<RosterRow>({
            schoolId,
            entityType: "AssessmentRosterStudent",
            entityId: student.studentId,
            operationType: "CACHE",
            payload: student,
            operationId: `assessment.roster-cache:${schoolId}:${assessmentId}:${student.studentId}`,
            record: {
              id: localRecordId(schoolId, "AssessmentRosterStudent", student.studentId),
              schoolId,
              entityType: "AssessmentRosterStudent",
              entityId: student.studentId,
              data: student,
              syncState: "SYNCED",
            },
          });
        }
      } catch {
        // Best-effort cache only.
      }
    })();
  }, [assessmentId, initialData.students, schoolId]);

  useEffect(() => {
    const cleanup = startSyncScheduler({ schoolId, executor: assessmentScoreSyncExecutor });
    return cleanup;
  }, [schoolId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const localScores = await listLocalRecords<{ assessmentId: string; studentId: string; score: number }>(schoolId, "AssessmentScore");
        const relevant = new Map(localScores.filter((record) => record.data.assessmentId === assessmentId).map((record) => [record.data.studentId, record]));
        if (!active || relevant.size === 0) return;
        setStudents((current) => current.map((student) => {
          const record = relevant.get(student.studentId);
          return record ? { ...student, score: record.data.score, syncState: record.syncState } : student;
        }));
      } catch {
        // Keep server-provided initial data.
      }
    })();
    return () => { active = false; };
  }, [assessmentId, schoolId]);

  const visibleStudents = useMemo(() => students, [students]);

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
      const operationId = `assessment.score:${schoolId}:${assessmentId}:${studentId}:${crypto.randomUUID()}`;
      const entityId = `${assessmentId}:${studentId}`;
      await saveLocalMutation<{ assessmentId: string; studentId: string; score: number }>({
        schoolId,
        entityType: "AssessmentScore",
        entityId,
        operationType: "UPSERT",
        payload: { assessmentId, studentId, score },
        operationId,
        record: {
          id: localRecordId(schoolId, "AssessmentScore", entityId),
          schoolId,
          entityType: "AssessmentScore",
          entityId,
          data: { assessmentId, studentId, score },
          syncState: "PENDING_SYNC",
        },
      });
      setStudents((current) => current.map((student) => student.studentId === studentId ? { ...student, score, syncState: "PENDING_SYNC" } : student));
      setMessage(online ? "Score saved locally and queued for synchronization." : "Score saved locally. It will synchronize when the connection returns.");
      if (online) void startSyncScheduler({ schoolId, executor: assessmentScoreSyncExecutor })();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save score locally.");
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
        <strong>{online ? "Online" : "Offline"} · Max {initialData.assessment.maxScore}</strong>
      </div>
      {visibleStudents.length === 0 ? <p style={{ color: "#8a3d2f" }}>No active students are enrolled in this class for the selected session.</p> : (
        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
          {visibleStudents.map((student, index) => (
            <div key={student.studentId} style={{ display: "grid", gridTemplateColumns: "44px minmax(180px, 1fr) 120px 150px", gap: 12, alignItems: "center", borderTop: "1px solid #edf0ee", padding: "10px 0" }}>
              <span style={{ color: "#53615a" }}>{index + 1}</span>
              <div><strong>{studentName(student)}</strong><div style={{ color: "#53615a", fontSize: 12 }}>{student.admissionNumber}</div></div>
              <input aria-label={`Score for ${studentName(student)}`} defaultValue={student.score ?? ""} type="number" min="0" max={initialData.assessment.maxScore} step="0.01" id={`score-${student.studentId}`} style={inputStyle} />
              <div style={{ display: "grid", gap: 6 }}>
                <button disabled={saving === student.studentId} onClick={() => save(student.studentId, (document.getElementById(`score-${student.studentId}`) as HTMLInputElement).value)} style={buttonStyle}>{saving === student.studentId ? "Saving…" : "Save locally"}</button>
                {student.syncState ? (
  <span style={{ color: "#53615a", fontSize: 12 }}>
    {syncLifecycleLabel[student.syncState]}
  </span>
) : null}
              </div>
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
