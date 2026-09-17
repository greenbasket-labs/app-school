import { createClientOperationId, localRecordId } from "@/domain/platform/client-operation";
import { saveLocalMutation, saveLocalRecord } from "@/domain/platform/local-repository";
import type { LocalRecord } from "@/domain/platform/local-store";
import type { BulkAttendanceItem } from "./bulk";

export const ATTENDANCE_ROSTER_ENTITY = "AttendanceRoster";
export const ATTENDANCE_BULK_ENTITY = "AttendanceBulk";
export const ATTENDANCE_BULK_OPERATION = "attendance.bulk";

export type AttendanceRosterStudent = {
  id: string;
  studentId: string;
  enrollmentId: string;
  admissionNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  status: BulkAttendanceItem["status"];
  note: string | null;
};

export type AttendanceRosterSnapshot = {
  academicSessionId: string;
  classArmId: string;
  attendanceDate: string;
  students: AttendanceRosterStudent[];
};

type AttendanceBulkPayload = {
  academicSessionId: string;
  classArmId: string;
  attendanceDate: string;
  items: BulkAttendanceItem[];
};

export type AttendanceBulkRecord = LocalRecord<AttendanceRosterSnapshot>;

export function attendanceRosterRecordId(input: Pick<AttendanceRosterSnapshot, "academicSessionId" | "classArmId" | "attendanceDate"> & { schoolId: string }) {
  return localRecordId(
    input.schoolId,
    ATTENDANCE_ROSTER_ENTITY,
    `${input.academicSessionId}:${input.classArmId}:${input.attendanceDate}`,
  );
}

export async function saveAttendanceRosterLocally(input: {
  schoolId: string;
  snapshot: AttendanceRosterSnapshot;
  syncState?: "SYNCED" | "PENDING_SYNC";
}) {
  return saveLocalRecord<AttendanceRosterSnapshot>({
    id: attendanceRosterRecordId({ schoolId: input.schoolId, ...input.snapshot }),
    schoolId: input.schoolId,
    entityType: ATTENDANCE_ROSTER_ENTITY,
    entityId: `${input.snapshot.academicSessionId}:${input.snapshot.classArmId}:${input.snapshot.attendanceDate}`,
    data: input.snapshot,
    syncState: input.syncState ?? "SYNCED",
  });
}

export async function queueAttendanceBulk(input: {
  schoolId: string;
  actorUserId?: string | null;
  snapshot: AttendanceRosterSnapshot;
  items: BulkAttendanceItem[];
  operationId?: string;
}) {
  const entityId = `${input.snapshot.academicSessionId}:${input.snapshot.classArmId}:${input.snapshot.attendanceDate}`;
  const operationId = input.operationId ?? createClientOperationId("attendance-bulk");
  const recordId = localRecordId(input.schoolId, ATTENDANCE_BULK_ENTITY, `${entityId}:${operationId}`);
  const itemByStudentId = new Map(input.items.map((item) => [item.studentId, item]));
  const optimisticSnapshot: AttendanceRosterSnapshot = {
    ...input.snapshot,
    students: input.snapshot.students.map((student) => {
      const item = itemByStudentId.get(student.studentId);
      return item ? { ...student, status: item.status, note: item.note?.trim() || null } : student;
    }),
  };

  const payload: AttendanceBulkPayload = {
    academicSessionId: optimisticSnapshot.academicSessionId,
    classArmId: optimisticSnapshot.classArmId,
    attendanceDate: optimisticSnapshot.attendanceDate,
    items: input.items,
  };

  const record = await saveLocalMutation<AttendanceBulkPayload, AttendanceRosterSnapshot>({
    schoolId: input.schoolId,
    actorUserId: input.actorUserId,
    entityType: ATTENDANCE_BULK_ENTITY,
    entityId: `${entityId}:${operationId}`,
    operationType: "UPSERT",
    operationId,
    payload,
    record: {
      id: recordId,
      schoolId: input.schoolId,
      entityType: ATTENDANCE_BULK_ENTITY,
      entityId: `${entityId}:${operationId}`,
      data: optimisticSnapshot,
      syncState: "PENDING_SYNC",
    },
  });

  await saveAttendanceRosterLocally({
    schoolId: input.schoolId,
    snapshot: optimisticSnapshot,
    syncState: "PENDING_SYNC",
  });

  return { record: record as AttendanceBulkRecord, operationId };
}
