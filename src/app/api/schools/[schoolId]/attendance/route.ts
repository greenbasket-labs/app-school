import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { AttendanceConflictError, getClassAttendance, recordAttendance } from "@/domain/attendance/service";
import { db } from "@/lib/db";

const schema = z.object({ academicSessionId: z.string().uuid(), classArmId: z.string().uuid(), studentId: z.string().uuid(), enrollmentId: z.string().uuid(), attendanceDate: z.coerce.date(), status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]), note: z.string().trim().max(500).optional() });
async function access(schoolId: string) { const session = await currentSession(); if (!session) throw new AuthorizationError("Authentication required."); return { session, membership: await requireCapability(session.user.id, schoolId, CAPABILITIES.RECORD_ATTENDANCE) }; }

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try { const schoolId = (await params).schoolId; await access(schoolId); const url = new URL(request.url); const classArmId = z.string().uuid().parse(url.searchParams.get("classArmId")); const date = z.coerce.date().parse(url.searchParams.get("date")); return NextResponse.json({ ok: true, records: await getClassAttendance(schoolId, classArmId, date) }); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "INVALID_ATTENDANCE_QUERY", issues: error.issues }, { status: 400 }); if (error instanceof AuthorizationError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 }); console.error("attendance query failed", error); return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 }); }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try { const schoolId = (await params).schoolId; const { session } = await access(schoolId); const input = schema.parse(await request.json()); const record = await recordAttendance({ schoolId, ...input, recordedByUserId: session.user.id }); await db.auditEvent.create({ data: { schoolId, actorUserId: session.user.id, action: "attendance.recorded", entityType: "AttendanceRecord", entityId: record.id, currentState: { studentId: record.studentId, classArmId: record.classArmId, attendanceDate: record.attendanceDate.toISOString(), status: record.status } } }); return NextResponse.json({ ok: true, record }, { status: 201 }); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "INVALID_ATTENDANCE_DATA", issues: error.issues }, { status: 400 }); if (error instanceof AttendanceConflictError) return NextResponse.json({ ok: false, error: "ATTENDANCE_EXISTS", message: error.message }, { status: 409 }); if (error instanceof AuthorizationError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 }); console.error("attendance request failed", error); return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 }); }
}
