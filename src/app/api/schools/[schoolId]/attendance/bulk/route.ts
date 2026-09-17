import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { getAttendanceRoster, saveBulkAttendance } from "@/domain/attendance/bulk";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { replayOrRecordIdempotentResult } from "@/domain/platform/sync-server";
import { db } from "@/lib/db";

const itemSchema = z.object({
  studentId: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  note: z.string().trim().max(500).optional(),
});

const schema = z.object({
  academicSessionId: z.string().uuid(),
  classArmId: z.string().uuid(),
  attendanceDate: z.coerce.date(),
  items: z.array(itemSchema).min(1).max(500),
});

type ExistingAttendanceRecord = {
  id: string;
  studentId: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  note: string | null;
  recordedByUserId: string;
  recordedAt: Date;
};

async function access(schoolId: string, capability: string) {
  const session = await currentSession();
  if (!session) throw new AuthorizationError("Authentication required.");

  const membership = await requireCapability(session.user.id, schoolId, capability);
  await requireSchoolModule(membership.schoolId, "ATTENDANCE");

  return { session, membership };
}

function attendanceServerVersion(
  academicSessionId: string,
  classArmId: string,
  attendanceDate: Date,
  records: Array<{ id: string; recordedAt: Date }>,
) {
  const latestRecordedAt = records.reduce<Date | null>(
    (latest, record) => (!latest || record.recordedAt > latest ? record.recordedAt : latest),
    null,
  );

  const latest = latestRecordedAt?.toISOString() ?? "empty";
  const recordIds = records.map((record) => record.id).sort().join(",");

  return [
    "attendance",
    academicSessionId,
    classArmId,
    attendanceDate.toISOString().slice(0, 10),
    latest,
    recordIds,
  ].join(":");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  try {
    const schoolId = (await params).schoolId;
    await access(schoolId, CAPABILITIES.VIEW_ATTENDANCE);

    const url = new URL(request.url);
    const input = z
      .object({
        academicSessionId: z.string().uuid(),
        classArmId: z.string().uuid(),
        date: z.coerce.date(),
      })
      .parse({
        academicSessionId: url.searchParams.get("academicSessionId"),
        classArmId: url.searchParams.get("classArmId"),
        date: url.searchParams.get("date"),
      });

    const roster = await getAttendanceRoster({
      schoolId,
      academicSessionId: input.academicSessionId,
      classArmId: input.classArmId,
      attendanceDate: input.date,
    });

    const attendanceIds = roster.flatMap((row) => (row.attendance ? [row.attendance.id] : []));
    const recordedRows = attendanceIds.length
      ? await db.attendanceRecord.findMany({
          where: { id: { in: attendanceIds }, schoolId },
          select: { id: true, recordedAt: true },
        })
      : [];

    return NextResponse.json({
      ok: true,
      roster,
      serverVersion: attendanceServerVersion(
        input.academicSessionId,
        input.classArmId,
        input.date,
        recordedRows,
      ),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ ok: false, error: "INVALID_ATTENDANCE_QUERY", issues: error.issues }, { status: 400 });
    }
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    }
    console.error("attendance roster failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  try {
    const schoolId = (await params).schoolId;
    const { session } = await access(schoolId, CAPABILITIES.RECORD_ATTENDANCE);
    const idempotencyKey = request.headers.get("Idempotency-Key");
    const input = schema.parse(await request.json());

    const execute = async () => {
      const existing = (await db.attendanceRecord.findMany({
        where: {
          schoolId,
          academicSessionId: input.academicSessionId,
          classArmId: input.classArmId,
          attendanceDate: input.attendanceDate,
          studentId: { in: input.items.map((item) => item.studentId) },
        },
        select: { id: true, studentId: true, status: true, note: true, recordedByUserId: true, recordedAt: true },
      })) as ExistingAttendanceRecord[];

      const before = new Map(existing.map((record) => [record.studentId, record]));
      const records = await saveBulkAttendance({
        schoolId,
        ...input,
        recordedByUserId: session.user.id,
      });

      await db.$transaction([
        db.auditEvent.create({
          data: {
            schoolId,
            actorUserId: session.user.id,
            action: "attendance.bulk_saved",
            entityType: "AttendanceRecord",
            entityId: input.classArmId,
            currentState: {
              academicSessionId: input.academicSessionId,
              classArmId: input.classArmId,
              attendanceDate: input.attendanceDate.toISOString(),
              count: records.length,
            },
          },
        }),
        ...records
          .filter((record) => {
            const old = before.get(record.studentId);
            return old && (old.status !== record.status || (old.note ?? null) !== (record.note ?? null));
          })
          .map((record) => {
            const old = before.get(record.studentId)!;
            return db.auditEvent.create({
              data: {
                schoolId,
                actorUserId: session.user.id,
                action: "attendance.corrected",
                entityType: "AttendanceRecord",
                entityId: record.id,
                previousState: {
                  status: old.status,
                  note: old.note,
                  recordedByUserId: old.recordedByUserId,
                  recordedAt: old.recordedAt.toISOString(),
                },
                currentState: {
                  status: record.status,
                  note: record.note,
                  recordedByUserId: record.recordedByUserId,
                  recordedAt: record.recordedAt.toISOString(),
                },
                metadata: { reason: "bulk_attendance_correction" },
              },
            });
          }),
      ]);

      const serverVersion = attendanceServerVersion(
        input.academicSessionId,
        input.classArmId,
        input.attendanceDate,
        records.map((record) => ({ id: record.id, recordedAt: record.recordedAt })),
      );

      return {
        records: records.map((record) => ({
          ...record,
          attendanceDate: record.attendanceDate.toISOString(),
          recordedAt: record.recordedAt.toISOString(),
          score: undefined,
        })),
        count: records.length,
        serverVersion,
      };
    };

    const result = idempotencyKey
      ? await replayOrRecordIdempotentResult({ schoolId, operation: "attendance.bulk", key: idempotencyKey, execute })
      : { replayed: false, result: await execute() };

    return NextResponse.json({
      ok: true,
      records: result.result.records,
      replayed: result.replayed,
      count: result.result.count,
      serverVersion: result.result.serverVersion,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ ok: false, error: "INVALID_ATTENDANCE_DATA", issues: error.issues }, { status: 400 });
    }
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    }
    console.error("bulk attendance save failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED", message: error instanceof Error ? error.message : undefined }, { status: 500 });
  }
}
