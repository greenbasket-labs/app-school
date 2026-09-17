import { classifyReconciliation, type AuthoritativeRecord } from "@/domain/platform/reconciliation";
import { applyAuthoritativeLocalRecord, getLocalRecordByEntity, markLocalRecordState, saveLocalRecord } from "@/domain/platform/local-repository";
import { localRecordId } from "@/domain/platform/client-operation";
import type { AttendanceRosterSnapshot } from "./offline-sync";

type AttendanceRosterPullResponse = {
  ok: boolean;
  roster: Array<{
    id: string;
    studentId: string;
    student: {
      admissionNumber: string;
      firstName: string;
      middleName: string | null;
      lastName: string;
    };
    attendance: {
      status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
      note: string | null;
    } | null;
  }>;
  serverVersion: string;
  error?: string;
  message?: string;
};

function snapshotFromRoster(input: {
  academicSessionId: string;
  classArmId: string;
  attendanceDate: string;
  roster: AttendanceRosterPullResponse["roster"];
}): AttendanceRosterSnapshot {
  return {
    academicSessionId: input.academicSessionId,
    classArmId: input.classArmId,
    attendanceDate: input.attendanceDate,
    students: input.roster.map((row) => ({
      id: row.id,
      studentId: row.studentId,
      enrollmentId: row.id,
      admissionNumber: row.student.admissionNumber,
      firstName: row.student.firstName,
      middleName: row.student.middleName,
      lastName: row.student.lastName,
      status: row.attendance?.status ?? "PRESENT",
      note: row.attendance?.note ?? null,
    })),
  };
}

export async function reconcileAttendanceRoster(input: {
  schoolId: string;
  academicSessionId: string;
  classArmId: string;
  attendanceDate: string;
  fetchImpl?: typeof fetch;
}) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const entityId = `${input.academicSessionId}:${input.classArmId}:${input.attendanceDate}`;
  const recordId = localRecordId(input.schoolId, "AttendanceRoster", entityId);

  const response = await fetchImpl(
    `/api/schools/${encodeURIComponent(input.schoolId)}/attendance/bulk?academicSessionId=${encodeURIComponent(input.academicSessionId)}&classArmId=${encodeURIComponent(input.classArmId)}&date=${encodeURIComponent(input.attendanceDate)}`,
    { credentials: "include", cache: "no-store" },
  );

  let payload: AttendanceRosterPullResponse;
  try {
    payload = (await response.json()) as AttendanceRosterPullResponse;
  } catch {
    throw new Error("Attendance reconciliation returned an unreadable response.");
  }

  if (!response.ok || !payload.ok || !payload.serverVersion) {
    throw new Error(payload.message ?? payload.error ?? `Attendance reconciliation failed (${response.status}).`);
  }

  const local = await getLocalRecordByEntity<AttendanceRosterSnapshot>(
    input.schoolId,
    "AttendanceRoster",
    entityId,
  );

  const serverData = snapshotFromRoster({
    academicSessionId: input.academicSessionId,
    classArmId: input.classArmId,
    attendanceDate: input.attendanceDate,
    roster: payload.roster,
  });

  const server: AuthoritativeRecord<AttendanceRosterSnapshot> = {
    schoolId: input.schoolId,
    entityType: "AttendanceRoster",
    entityId,
    data: serverData,
    serverVersion: payload.serverVersion,
    updatedAt: new Date().toISOString(),
  };

  const decision = classifyReconciliation(local, server, {
    canApplyServerRecord: (current) => current?.syncState !== "PENDING_SYNC" && current?.syncState !== "SYNCING",
  });

  if (decision === "IGNORE") {
    return { pulled: true, applied: false, conflict: false, decision, record: local };
  }

  if (decision === "CONFLICT") {
    if (local) await markLocalRecordState(local.id, "CONFLICT", server.serverVersion);
    return { pulled: true, applied: false, conflict: true, decision, record: local ?? null };
  }

  const record = local
    ? await applyAuthoritativeLocalRecord({
        id: local.id,
        data: server.data,
        serverVersion: server.serverVersion,
        updatedAt: server.updatedAt,
      })
    : await saveLocalRecord({
        id: recordId,
        schoolId: input.schoolId,
        entityType: "AttendanceRoster",
        entityId,
        data: server.data,
        syncState: "SYNCED",
        serverVersion: server.serverVersion,
        updatedAt: server.updatedAt,
      });

  return { pulled: true, applied: true, conflict: false, decision, record };
}
