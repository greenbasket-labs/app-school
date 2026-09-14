import { Temporal } from "@js-temporal/polyfill";
import { db } from "../prisma/db";
import { hasPermission } from "./permissions";
import { writeAuditLog } from "./audit";

export type AttendancePeriod =
  | "FIRST_PERIOD"
  | "SECOND_PERIOD";

export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT";

export type SaveAttendanceInput = {
  schoolId: number;
  classId: number;
  studentIds: number[];
  attendanceDate: Date;
  period: AttendancePeriod;
  markedByUserId: number;
};

function toInstant(date: Date) {
  return Temporal.Instant.fromEpochMilliseconds(
    date.getTime(),
  );
}

/**
 * Convert a database attendance date into
 * epoch milliseconds.
 *
 * Prisma 8 may return Timestamptz values as
 * Temporal.Instant, so we must not depend on
 * String(instant).slice(0, 10).
 */
function attendanceRecordTime(
  value: Date | Temporal.Instant | string,
): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (
    value &&
    typeof value === "object" &&
    "epochMilliseconds" in value
  ) {
    return Number(
      (value as Temporal.Instant).epochMilliseconds,
    );
  }

  return new Date(String(value)).getTime();
}

/**
 * Get the school's attendance configuration.
 *
 * callsPerDay:
 * 1 = first period only
 * 2 = first and second period
 */
async function getAttendanceSetting(
  schoolId: number,
) {
  const settings =
    await db.orm.public.AttendanceSetting.all();

  return (
    settings.find(
      (setting) =>
        setting.schoolId === schoolId,
    ) ?? null
  );
}

async function getClassStudents(
  schoolId: number,
  classId: number,
) {
  const students =
    await db.orm.public.Student.all();

  return students.filter(
    (student) =>
      student.schoolId === schoolId &&
      student.currentClassId === classId &&
      student.status === "ACTIVE",
  );
}

/**
 * Get the school's attendance configuration.
 *
 * callsPerDay:
 * 1 = first period only
 * 2 = first and second period
 */
export async function getAttendanceCallsPerDay(
  schoolId: number,
) {
  const setting =
    await getAttendanceSetting(schoolId);

  return setting?.callsPerDay === 2
    ? 2
    : 1;
}

/**
 * Returns the attendance record for one
 * student/date/period.
 */
export async function getStudentAttendance(
  schoolId: number,
  studentId: number,
  attendanceDate: Date,
  period: AttendancePeriod,
) {
  const records =
    await db.orm.public.AttendanceRecord.all();

  const dayStart =
    new Date(
      attendanceDate.getFullYear(),
      attendanceDate.getMonth(),
      attendanceDate.getDate(),
    ).getTime();

  const dayEnd =
    new Date(
      attendanceDate.getFullYear(),
      attendanceDate.getMonth(),
      attendanceDate.getDate() + 1,
    ).getTime();

  return (
    records.find((record) => {
      const recordTime =
        attendanceRecordTime(
          record.attendanceDate,
        );

      return (
        record.schoolId === schoolId &&
        record.studentId === studentId &&
        recordTime >= dayStart &&
        recordTime < dayEnd &&
        record.period === period
      );
    }) ?? null
  );
}

/**
 * Get all attendance records for a class
 * on a particular date and period.
 */
export async function getClassAttendance(
  schoolId: number,
  classId: number,
  attendanceDate: Date,
  period: AttendancePeriod,
) {
  const records =
    await db.orm.public.AttendanceRecord.all();

  const dayStart =
    new Date(
      attendanceDate.getFullYear(),
      attendanceDate.getMonth(),
      attendanceDate.getDate(),
    ).getTime();

  const dayEnd =
    new Date(
      attendanceDate.getFullYear(),
      attendanceDate.getMonth(),
      attendanceDate.getDate() + 1,
    ).getTime();

  return records.filter((record) => {
    const recordTime =
      attendanceRecordTime(
        record.attendanceDate,
      );

    return (
      record.schoolId === schoolId &&
      record.classId === classId &&
      recordTime >= dayStart &&
      recordTime < dayEnd &&
      record.period === period
    );
  });
}

/**
 * Check whether attendance has already been
 * submitted for a class/date/period.
 */
export async function isClassAttendanceTaken(
  schoolId: number,
  classId: number,
  attendanceDate: Date,
  period: AttendancePeriod,
) {
  const records =
    await getClassAttendance(
      schoolId,
      classId,
      attendanceDate,
      period,
    );

  return records.length > 0;
}

/**
 * Save attendance for a whole class.
 *
 * studentIds contains the students marked PRESENT.
 *
 * Every active student in the class who is not
 * included becomes ABSENT.
 */
export async function saveClassAttendance(
  input: SaveAttendanceInput,
) {
  const allowed =
    await hasPermission(
      input.markedByUserId,
      "attendance.mark",
    );

  if (!allowed) {
    throw new Error(
      "Permission denied: attendance.mark",
    );
  }

  const users = await db.orm.public.User.all();
  const marker = users.find(
    (user) =>
      user.id === input.markedByUserId &&
      user.schoolId === input.schoolId &&
      user.status === "ACTIVE",
  );

  if (!marker) {
    throw new Error(
      "Attendance marker is not an active user in this school.",
    );
  }

  if (
    input.period !== "FIRST_PERIOD" &&
    input.period !== "SECOND_PERIOD"
  ) {
    throw new Error(
      "Invalid attendance period.",
    );
  }

  const callsPerDay =
    await getAttendanceCallsPerDay(
      input.schoolId,
    );

  if (
    callsPerDay === 1 &&
    input.period === "SECOND_PERIOD"
  ) {
    throw new Error(
      "Second period attendance is disabled for this school.",
    );
  }

  const schools =
    await db.orm.public.School.all();

  const school = schools.find(
    (item) =>
      item.id === input.schoolId,
  );

  if (!school) {
    throw new Error(
      "School not found.",
    );
  }

  const classes =
    await db.orm.public.SchoolClass.all();

  const schoolClass =
    classes.find(
      (item) =>
        item.id === input.classId &&
        item.schoolId === input.schoolId,
    );

  if (!schoolClass) {
    throw new Error(
      "Class not found in this school.",
    );
  }

  const classStudents =
    await getClassStudents(
      input.schoolId,
      input.classId,
    );

  if (classStudents.length === 0) {
    throw new Error(
      "There are no active students in this class.",
    );
  }

  const validStudentIds =
    new Set(
      classStudents.map(
        (student) => student.id,
      ),
    );

  const uniquePresentIds =
    Array.from(
      new Set(input.studentIds),
    );

  for (
    const studentId of uniquePresentIds
  ) {
    if (
      !validStudentIds.has(studentId)
    ) {
      throw new Error(
        "One or more selected students do not belong to this class.",
      );
    }
  }

  const alreadyTaken =
    await isClassAttendanceTaken(
      input.schoolId,
      input.classId,
      input.attendanceDate,
      input.period,
    );

  if (alreadyTaken) {
    const canEdit =
      await hasPermission(
        input.markedByUserId,
        "attendance.edit",
      );

    if (!canEdit) {
      throw new Error(
        "Attendance has already been submitted for this class, date, and period.",
      );
    }
  }

  const attendanceDate =
    toInstant(
      input.attendanceDate,
    );

  const existingRecords =
    await getClassAttendance(
      input.schoolId,
      input.classId,
      input.attendanceDate,
      input.period,
    );

  const existingByStudent =
    new Map(
      existingRecords.map(
        (record) => [
          record.studentId,
          record,
        ],
      ),
    );

  const presentIds =
    new Set(uniquePresentIds);

  const savedRecords = [];

  for (
    const student of classStudents
  ) {
    const status: AttendanceStatus =
      presentIds.has(student.id)
        ? "PRESENT"
        : "ABSENT";

    const existing =
      existingByStudent.get(
        student.id,
      );

    if (existing) {
      const updated =
        await db.orm.public.AttendanceRecord
          .where({
            id: existing.id,
          })
          .update({
            status,
            markedByUserId:
              input.markedByUserId,
            updatedAt:
              Temporal.Now
                .instant()
                .toString(),
          });

      savedRecords.push(updated);
    } else {
      const created =
        await db.orm.public.AttendanceRecord
          .create({
            schoolId:
              input.schoolId,
            studentId:
              student.id,
            classId:
              input.classId,
            attendanceDate,
            period:
              input.period,
            status,
            markedByUserId:
              input.markedByUserId,
          });

      savedRecords.push(created);
    }
  }

  await writeAuditLog({
    schoolId: input.schoolId,
    userId: input.markedByUserId,
    action: alreadyTaken ? "UPDATE" : "CREATE",
    entity: "Attendance",
    entityId: `${input.classId}:${input.attendanceDate.toISOString()}:${input.period}`,
    newValue: {
      classId: input.classId,
      attendanceDate: input.attendanceDate,
      period: input.period,
      totalStudents: classStudents.length,
      present: presentIds.size,
      absent: classStudents.length - presentIds.size,
    },
  });

  return {
    classId:
      input.classId,

    attendanceDate:
      input.attendanceDate,

    period:
      input.period,

    totalStudents:
      classStudents.length,

    present:
      classStudents.filter(
        (student) =>
          presentIds.has(
            student.id,
          ),
      ).length,

    absent:
      classStudents.filter(
        (student) =>
          !presentIds.has(
            student.id,
          ),
      ).length,

    records:
      savedRecords,
  };
}

/**
 * Get attendance summary for one student
 * within a date range.
 */
export async function getStudentAttendanceSummary(
  schoolId: number,
  studentId: number,
  startDate?: Date,
  endDate?: Date,
) {
  const records =
    await db.orm.public.AttendanceRecord.all();

  const filtered =
    records.filter((record) => {
      if (
        record.schoolId !== schoolId ||
        record.studentId !== studentId
      ) {
        return false;
      }

      const recordTime =
        attendanceRecordTime(
          record.attendanceDate,
        );

      if (startDate) {
        if (
          recordTime <
          startDate.getTime()
        ) {
          return false;
        }
      }

      if (endDate) {
        if (
          recordTime >
          endDate.getTime()
        ) {
          return false;
        }
      }

      return true;
    });

  const present =
    filtered.filter(
      (record) =>
        record.status === "PRESENT",
    ).length;

  const absent =
    filtered.filter(
      (record) =>
        record.status === "ABSENT",
    ).length;

  const total =
    filtered.length;

  return {
    total,
    present,
    absent,
    attendanceRate:
      total > 0
        ? (present / total) * 100
        : 0,
  };
}

/**
 * Get a simple class attendance summary
 * for a date and period.
 */
export async function getClassAttendanceSummary(
  schoolId: number,
  classId: number,
  attendanceDate: Date,
  period: AttendancePeriod,
) {
  const students =
    await getClassStudents(
      schoolId,
      classId,
    );

  const records =
    await getClassAttendance(
      schoolId,
      classId,
      attendanceDate,
      period,
    );

  const present =
    records.filter(
      (record) =>
        record.status === "PRESENT",
    ).length;

  const absent =
    records.filter(
      (record) =>
        record.status === "ABSENT",
    ).length;

  return {
    totalStudents:
      students.length,

    present,

    absent,

    taken:
      records.length > 0,
  };
}