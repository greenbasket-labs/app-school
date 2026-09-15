import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { AttendanceConflictError, getClassAttendance, recordAttendance } from "@/domain/attendance/service";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";

const schema = z.object({ academicSessionId: z.string().uuid(), classArmId: z.string().uuid(), studentId: z.string().uuid(), enrollmentId: z.string().uuid(), attendanceDate: z.coerce.date(), status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]), note: z.string().trim().max(500).optional() });
const correctionSchema = z.object({ status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]), note: z.string().trim().max(500).optional() });

async function access(schoolId: string, capability: string) {
  const session = await currentSession();
  if (!session) throw new AuthorizationError("Authentication required.");
  const membership = await requireCapability(session.user.id, schoolId, capability);
  await requireSchoolModule(membership.schoolId, "ATTENDANCE");
  return { session, membership };
}

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    await access(schoolId, CAPABILITIES.VIEW_ATTENDANCE);
    const url = new URL(request.url);
    const classArmId = z.string().uuid().parse(url.searchParams.get("classArmId"));
    const date = z.coerce.date().parse(url.searchParams.get("date"));
    return NextResponse.json({ ok: true, records: await getClassAttendance(schoolId, classArmId, date) });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "INVALID_ATTENDANCE_QUERY", issues: error.issues }, { status: 400 });
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("attendance query failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const { session } = await access(schoolId, CAPABILITIES.RECORD_ATTENDANCE);
    const input = schema.parse(await request.json());
    const record = await recordAttendance({ schoolId, ...input, recordedByUserId: session.user.id });
    await db.auditEvent.create({ data: { schoolId, actorUserId: session.user.id, action: "attendance.recorded", entityType: "AttendanceRecord", entityId: record.id, currentState: { studentId: record.studentId, classArmId: record.classArmId, attendanceDate: record.attendanceDate.toISOString(), status: record.status } } });
    return NextResponse.json({ ok: true, record }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "INVALID_ATTENDANCE_DATA", issues: error.issues }, { status: 400 });
    if (error instanceof AttendanceConflictError) return NextResponse.json({ ok: false, error: "ATTENDANCE_EXISTS", message: error.message }, { status: 409 });
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("attendance request failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const { session } = await access(schoolId, CAPABILITIES.RECORD_ATTENDANCE);
    const recordId = z.string().uuid().parse(new URL(request.url).searchParams.get("recordId"));
    const input = correctionSchema.parse(await request.json());
    const existing = await db.attendanceRecord.findFirst({ where: { id: recordId, schoolId }, select: { id: true, studentId: true, enrollmentId: true, classArmId: true, academicSessionId: true, attendanceDate: true, status: true, note: true, recordedByUserId: true, recordedAt: true } });
    if (!existing) return NextResponse.json({ ok: false, error: "ATTENDANCE_NOT_FOUND" }, { status: 404 });
    if (existing.status === input.status && (existing.note ?? null) === (input.note?.trim() || null)) return NextResponse.json({ ok: true, record: existing, changed: false });

    const updated = await db.attendanceRecord.update({ where: { id: existing.id }, data: { status: input.status, note: input.note?.trim() || null, recordedByUserId: session.user.id, recordedAt: new Date() } });
    await db.auditEvent.create({ data: { schoolId, actorUserId: session.user.id, action: "attendance.corrected", entityType: "AttendanceRecord", entityId: updated.id, previousState: { status: existing.status, note: existing.note, recordedByUserId: existing.recordedByUserId, recordedAt: existing.recordedAt.toISOString() }, currentState: { status: updated.status, note: updated.note, recordedByUserId: updated.recordedByUserId, recordedAt: updated.recordedAt.toISOString() }, metadata: { reason: "attendance_correction" } } });
    return NextResponse.json({ ok: true, record: updated, changed: true });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "INVALID_ATTENDANCE_CORRECTION", issues: error.issues }, { status: 400 });
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("attendance correction failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
