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

export type AttendanceBulkRecord = LocalRecord<AttendanceRosterSnapshot>;

function rosterEntityId(input: Pick<AttendanceRosterSnapshot, "academicSessionId" | "classArmId" | "attendanceDate">) {
  return `${input.academicSessionId}:${input.classArmId}:${input.attendanceDate}`;
}

export function attendanceRosterRecordId(input: Pick<AttendanceRosterSnapshot, "academicSessionId" | "classArmId" | "attendanceDate"> & { schoolId: string }) {
  return localRecordId(input.schoolId, ATTENDANCE_ROSTER_ENTITY, rosterEntityId(input));
}

export async function saveAttendanceRosterLocally(input: {
  schoolId: string;
  snapshot: AttendanceRosterSnapshot;
}) {
  return saveLocalRecord({
    id: attendanceRosterRecordId({ schoolId: input.schoolId, ...input.snapshot }),
    schoolId: input.schoolId,
    entityType: ATTENDANCE_ROSTER_ENTITY,
    entityId: rosterEntityId(input.snapshot),
    data: input.snapshot,
    syncState: "SYNCED",
  });
}

export async function queueAttendanceBulk(input: {
  schoolId: string;
  actorUserId?: string | null;
  snapshot: AttendanceRosterSnapshot;
  items: BulkAttendanceItem[];
  operationId?: string;
}) {
  const entityId = rosterEntityId(input.snapshot);
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

  const record = await saveLocalMutation({
    schoolId: input.schoolId,
    actorUserId: input.actorUserId,
    entityType: ATTENDANCE_BULK_ENTITY,
    entityId: `${entityId}:${operationId}`,
    operationType: "UPSERT",
    operationId,
    payload: {
      academicSessionId: optimisticSnapshot.academicSessionId,
      classArmId: optimisticSnapshot.classArmId,
      attendanceDate: optimisticSnapshot.attendanceDate,
      items: input.items,
    },
    record: {
      id: recordId,
      schoolId: input.schoolId,
      entityType: ATTENDANCE_BULK_ENTITY,
      entityId: `${entityId}:${operationId}`,
      data: optimisticSnapshot,
      syncState: "PENDING_SYNC",
    },
  });

  return { record: record as AttendanceBulkRecord, operationId };
}
