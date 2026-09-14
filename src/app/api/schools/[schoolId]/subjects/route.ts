import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { createSubject, getSubjects, SchoolStructureConflictError } from "@/domain/school-structure/service";
import { db } from "@/lib/db";

const schema = z.object({ name: z.string().trim().min(1).max(120), code: z.string().trim().max(30).optional().nullable() });
async function access(schoolId: string) { const session = await currentSession(); if (!session) throw new AuthorizationError("Authentication required."); return requireCapability(session.user.id, schoolId, CAPABILITIES.MANAGE_SCHOOL); }

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) { try { const membership = await access((await params).schoolId); return NextResponse.json({ ok: true, subjects: await getSubjects(membership.schoolId) }); } catch (error) { return response(error); } }
export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try { const membership = await access((await params).schoolId); const input = schema.parse(await request.json()); const subject = await createSubject({ schoolId: membership.schoolId, ...input }); await db.auditEvent.create({ data: { schoolId: membership.schoolId, actorUserId: membership.userId, action: "subject.created", entityType: "Subject", entityId: subject.id, currentState: { name: subject.name, code: subject.code } } }); return NextResponse.json({ ok: true, subject }, { status: 201 }); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "INVALID_SUBJECT_DATA", issues: error.issues }, { status: 400 }); if (error instanceof SchoolStructureConflictError) return NextResponse.json({ ok: false, error: "SUBJECT_EXISTS", message: error.message }, { status: 409 }); return response(error); }
}
function response(error: unknown) { if (error instanceof AuthorizationError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 }); console.error("subject request failed", error); return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 }); }
