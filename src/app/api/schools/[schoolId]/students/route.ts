import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { createStudent, getStudents, StudentConflictError } from "@/domain/students/service";
import { db } from "@/lib/db";

const schema = z.object({ admissionNumber: z.string().trim().min(1).max(50), firstName: z.string().trim().min(1).max(100), middleName: z.string().trim().max(100).optional(), lastName: z.string().trim().min(1).max(100), dateOfBirth: z.coerce.date().optional() });
async function access(schoolId: string) { const session = await currentSession(); if (!session) throw new AuthorizationError("Authentication required."); return requireCapability(session.user.id, schoolId, CAPABILITIES.MANAGE_STUDENTS); }

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try { const membership = await access((await params).schoolId); return NextResponse.json({ ok: true, students: await getStudents(membership.schoolId) }); }
  catch (error) { if (error instanceof AuthorizationError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 }); console.error("student list failed", error); return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 }); }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try { const membership = await access((await params).schoolId); const student = await createStudent({ schoolId: membership.schoolId, ...schema.parse(await request.json()) }); await db.auditEvent.create({ data: { schoolId: membership.schoolId, actorUserId: membership.userId, action: "student.created", entityType: "Student", entityId: student.id, currentState: { admissionNumber: student.admissionNumber, status: student.status } } }); return NextResponse.json({ ok: true, student }, { status: 201 }); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "INVALID_STUDENT_DATA", issues: error.issues }, { status: 400 }); if (error instanceof StudentConflictError) return NextResponse.json({ ok: false, error: "STUDENT_EXISTS", message: error.message }, { status: 409 }); if (error instanceof AuthorizationError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 }); console.error("student create failed", error); return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 }); }
}
