import { describe, expect, it } from "vitest";
import { getLocalRecordByEntity } from "@/domain/platform/local-repository";
import { getPendingOutbox } from "@/domain/platform/local-outbox";
import {
  queueAttendanceBulk,
  saveAttendanceRosterLocally,
  type AttendanceRosterSnapshot,
} from "./offline-sync";

const schoolId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const sessionId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const classArmId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const attendanceDate = "2026-09-17T00:00:00.000Z";
const rosterEntityId = `${sessionId}:${classArmId}:${attendanceDate}`;

const snapshot: AttendanceRosterSnapshot = {
  academicSessionId: sessionId,
  classArmId,
  attendanceDate,
  students: [
    {
      id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      studentId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      enrollmentId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      admissionNumber: "ADM-001",
      firstName: "Amina",
      middleName: null,
      lastName: "Abdullahi",
      status: "PRESENT",
      note: null,
    },
  ],
};

describe("attendance offline sync persistence", () => {
  it("caches the roster without creating an outbox operation", async () => {
    await saveAttendanceRosterLocally({ schoolId, snapshot });

    const cached = await getLocalRecordByEntity<AttendanceRosterSnapshot>(schoolId, "AttendanceRoster", rosterEntityId);
    const outbox = await getPendingOutbox(schoolId);

    expect(cached?.data).toEqual(snapshot);
    expect(cached?.syncState).toBe("SYNCED");
    expect(outbox.filter((item) => item.entityType === "AttendanceBulk")).toHaveLength(0);
  });

  it("stores the optimistic attendance in the roster cache and queues the same payload", async () => {
    await saveAttendanceRosterLocally({ schoolId, snapshot });

    const result = await queueAttendanceBulk({
      schoolId,
      snapshot,
      items: [
        {
          studentId: snapshot.students[0].studentId,
          enrollmentId: snapshot.students[0].enrollmentId,
          status: "ABSENT",
          note: "Sick",
        },
      ],
      operationId: "attendance-op-test",
    });

    const cached = await getLocalRecordByEntity<AttendanceRosterSnapshot>(schoolId, "AttendanceRoster", rosterEntityId);
    const outbox = await getPendingOutbox(schoolId);

    expect(result.operationId).toBe("attendance-op-test");
    expect(cached?.data.students[0].status).toBe("ABSENT");
    expect(cached?.data.students[0].note).toBe("Sick");
    expect(cached?.syncState).toBe("PENDING_SYNC");
    expect(outbox.find((item) => item.operationId === "attendance-op-test")?.payload).toMatchObject({
      academicSessionId: sessionId,
      classArmId,
      attendanceDate,
      items: [{ studentId: snapshot.students[0].studentId, status: "ABSENT", note: "Sick" }],
    });
  });
});
