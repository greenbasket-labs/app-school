import { describe, expect, it, vi } from "vitest";
import { reconcileAttendanceRoster } from "./reconciliation-client";
import * as repository from "@/domain/platform/local-repository";
import type { AttendanceRosterSnapshot } from "./offline-sync";

const schoolId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const academicSessionId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const classArmId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const attendanceDate = "2026-09-17";
const entityId = `${academicSessionId}:${classArmId}:${attendanceDate}`;

const snapshot: AttendanceRosterSnapshot = {
  academicSessionId,
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

function response(version = "attendance-v2") {
  return new Response(
    JSON.stringify({
      ok: true,
      roster: [
        {
          id: snapshot.students[0].id,
          studentId: snapshot.students[0].studentId,
          student: {
            admissionNumber: "ADM-001",
            firstName: "Amina",
            middleName: null,
            lastName: "Abdullahi",
          },
          attendance: { status: "ABSENT", note: "Sick" },
        },
      ],
      serverVersion: version,
    }),
    { status: 200, headers: { "Content-Type": "application/json", "X-Server-Version": version } },
  );
}

describe("attendance roster reconciliation", () => {
  it("applies a fresh server snapshot", async () => {
    vi.spyOn(repository, "getLocalRecordByEntity").mockResolvedValue(null);
    const save = vi.spyOn(repository, "saveLocalRecord").mockImplementation(async (record) => ({ ...record, updatedAt: record.updatedAt ?? "now" } as never));
    const fetchImpl = vi.fn(async () => response("attendance-v2"));

    const result = await reconcileAttendanceRoster({
      schoolId,
      academicSessionId,
      classArmId,
      attendanceDate,
      fetchImpl,
    });

    expect(result.applied).toBe(true);
    expect(result.conflict).toBe(false);
    expect(save).toHaveBeenCalled();
    expect(save.mock.calls[0][0].data.students[0].status).toBe("ABSENT");
  });

  it("ignores a local record already at the server version", async () => {
    vi.spyOn(repository, "getLocalRecordByEntity").mockResolvedValue({
      id: "local-id",
      schoolId,
      entityType: "AttendanceRoster",
      entityId,
      data: snapshot,
      syncState: "SYNCED",
      serverVersion: "attendance-v2",
      updatedAt: "2026-09-17T10:00:00.000Z",
    });
    const apply = vi.spyOn(repository, "applyAuthoritativeLocalRecord");
    const fetchImpl = vi.fn(async () => response("attendance-v2"));

    const result = await reconcileAttendanceRoster({
      schoolId,
      academicSessionId,
      classArmId,
      attendanceDate,
      fetchImpl,
    });

    expect(result.decision).toBe("IGNORE");
    expect(result.applied).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });

  it("marks a pending local record as conflict", async () => {
    vi.spyOn(repository, "getLocalRecordByEntity").mockResolvedValue({
      id: "local-id",
      schoolId,
      entityType: "AttendanceRoster",
      entityId,
      data: snapshot,
      syncState: "PENDING_SYNC",
      serverVersion: "attendance-v1",
      updatedAt: "2026-09-17T10:00:00.000Z",
    });
    const mark = vi.spyOn(repository, "markLocalRecordState").mockResolvedValue({
      id: "local-id",
      schoolId,
      entityType: "AttendanceRoster",
      entityId,
      data: snapshot,
      syncState: "CONFLICT",
      serverVersion: "attendance-v2",
      updatedAt: "2026-09-17T10:01:00.000Z",
    });
    const fetchImpl = vi.fn(async () => response("attendance-v2"));

    const result = await reconcileAttendanceRoster({
      schoolId,
      academicSessionId,
      classArmId,
      attendanceDate,
      fetchImpl,
    });

    expect(result.decision).toBe("CONFLICT");
    expect(result.conflict).toBe(true);
    expect(mark).toHaveBeenCalledWith("local-id", "CONFLICT", "attendance-v2");
  });
});
