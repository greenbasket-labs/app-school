import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { createClassLevel, getClassLevels, SchoolStructureConflictError } from "@/domain/school-structure/service";
import { db } from "@/lib/db";

const schema = z.object({ name: z.string().trim().min(1).max(80), order: z.coerce.number().int().min(1).max(200) });

async function access(schoolId: string) {
  const session = await currentSession();
  if (!session) throw new AuthorizationError("Authentication required.");
  return requireCapability(session.user.id, schoolId, CAPABILITIES.MANAGE_SCHOOL);
}

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try { const membership = await access((await params).schoolId); return NextResponse.json({ ok: true, classLevels: await getClassLevels(membership.schoolId) }); }
  catch (error) { return response(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const membership = await access((await params).schoolId);
    const input = schema.parse(await request.json());
    const classLevel = await createClassLevel({ schoolId: membership.schoolId, ...input });
    await db.auditEvent.create({ data: { schoolId: membership.schoolId, actorUserId: membership.userId, action: "class_level.created", entityType: "ClassLevel", entityId: classLevel.id, currentState: { name: classLevel.name, order: classLevel.order } } });
    return NextResponse.json({ ok: true, classLevel }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "INVALID_CLASS_LEVEL_DATA", issues: error.issues }, { status: 400 });
    if (error instanceof SchoolStructureConflictError) return NextResponse.json({ ok: false, error: "CLASS_LEVEL_EXISTS", message: error.message }, { status: 409 });
    return response(error);
  }
}

function response(error: unknown) {
  if (error instanceof AuthorizationError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
  console.error("class level request failed", error); return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
}
