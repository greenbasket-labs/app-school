import { createClientOperationId, localRecordId } from "@/domain/platform/client-operation";
import { saveLocalMutation } from "@/domain/platform/local-repository";
import type { LocalRecord } from "@/domain/platform/local-store";
import type { BulkAttendanceItem } from "./bulk";

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

export function attendanceRosterRecordId(input: Pick<AttendanceRosterSnapshot, "academicSessionId" | "classArmId" | "attendanceDate"> & { schoolId: string }) {
  return localRecordId(
    input.schoolId,
    ATTENDANCE_BULK_ENTITY,
    `${input.academicSessionId}:${input.classArmId}:${input.attendanceDate}`,
  );
}

export async function saveAttendanceRosterLocally(input: {
  schoolId: string;
  snapshot: AttendanceRosterSnapshot;
}) {
  return saveLocalMutation({
    schoolId: input.schoolId,
    entityType: ATTENDANCE_BULK_ENTITY,
    entityId: `${input.snapshot.academicSessionId}:${input.snapshot.classArmId}:${input.snapshot.attendanceDate}`,
    operationType: "CACHE",
    operationId: createClientOperationId("attendance-cache"),
    payload: input.snapshot,
    record: {
      id: attendanceRosterRecordId({ schoolId: input.schoolId, ...input.snapshot }),
      schoolId: input.schoolId,
      entityType: ATTENDANCE_BULK_ENTITY,
      entityId: `${input.snapshot.academicSessionId}:${input.snapshot.classArmId}:${input.snapshot.attendanceDate}`,
      data: input.snapshot,
      syncState: "SYNCED",
    },
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
  const recordId = attendanceRosterRecordId({ schoolId: input.schoolId, ...input.snapshot });
  const snapshot: AttendanceRosterSnapshot = {
    ...input.snapshot,
    students: input.snapshot.students.map((student) => {
      const item = input.items.find((candidate) => candidate.studentId === student.studentId);
      return item
        ? { ...student, status: item.status, note: item.note?.trim() || null }
        : student;
    }),
  };

  const record = await saveLocalMutation({
    schoolId: input.schoolId,
    actorUserId: input.actorUserId,
    entityType: ATTENDANCE_BULK_ENTITY,
    entityId,
    operationType: "UPSERT",
    operationId,
    payload: {
      academicSessionId: snapshot.academicSessionId,
      classArmId: snapshot.classArmId,
      attendanceDate: snapshot.attendanceDate,
      items: input.items,
    },
    record: {
      id: recordId,
      schoolId: input.schoolId,
      entityType: ATTENDANCE_BULK_ENTITY,
      entityId,
      data: snapshot,
      syncState: "PENDING_SYNC",
    },
  });

  return { record: record as AttendanceBulkRecord, operationId };
}
