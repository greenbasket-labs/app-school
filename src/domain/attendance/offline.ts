import { localRecordId } from "@/domain/platform/client-operation";
import { saveLocalMutation } from "@/domain/platform/local-repository";

export type LocalAttendanceItem = {
  studentId: string;
  enrollmentId: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  note?: string;
};

export type LocalAttendanceDay = {
  academicSessionId: string;
  classArmId: string;
  attendanceDate: string;
  items: LocalAttendanceItem[];
};

export async function saveAttendanceLocally(input: {
  schoolId: string;
  operationId: string;
  actorUserId?: string | null;
  data: LocalAttendanceDay;
}) {
  const entityId = `${input.data.academicSessionId}:${input.data.classArmId}:${input.data.attendanceDate}`;

  return saveLocalMutation<LocalAttendanceDay>({
    schoolId: input.schoolId,
    actorUserId: input.actorUserId,
    entityType: "AttendanceDay",
    entityId,
    operationType: "UPSERT",
    payload: input.data,
    operationId: input.operationId,
    record: {
      id: localRecordId(input.schoolId, "AttendanceDay", entityId),
      schoolId: input.schoolId,
      entityType: "AttendanceDay",
      entityId,
      data: input.data,
      syncState: "PENDING_SYNC",
    },
  });
}
