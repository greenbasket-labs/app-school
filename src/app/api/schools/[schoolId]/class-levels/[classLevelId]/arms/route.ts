import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { createClassArm, SchoolStructureConflictError } from "@/domain/school-structure/service";
import { db } from "@/lib/db";

const schema = z.object({ name: z.string().trim().min(1).max(40) });
async function access(schoolId: string) { const session = await currentSession(); if (!session) throw new AuthorizationError("Authentication required."); return requireCapability(session.user.id, schoolId, CAPABILITIES.MANAGE_SCHOOL); }

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string; classLevelId: string }> }) {
  const { schoolId, classLevelId } = await params;
  try { const membership = await access(schoolId); const input = schema.parse(await request.json()); const classArm = await createClassArm({ schoolId: membership.schoolId, classLevelId, ...input }); await db.auditEvent.create({ data: { schoolId: membership.schoolId, actorUserId: membership.userId, action: "class_arm.created", entityType: "ClassArm", entityId: classArm.id, currentState: { classLevelId, name: classArm.name } } }); return NextResponse.json({ ok: true, classArm }, { status: 201 }); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "INVALID_CLASS_ARM_DATA", issues: error.issues }, { status: 400 }); if (error instanceof SchoolStructureConflictError) return NextResponse.json({ ok: false, error: "CLASS_ARM_EXISTS", message: error.message }, { status: 409 }); if (error instanceof AuthorizationError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 }); console.error("class arm request failed", error); return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 }); }
}
