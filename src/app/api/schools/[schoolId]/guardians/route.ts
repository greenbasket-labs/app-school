import { NextResponse } from "next/server";
import { z } from "zod";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { requireCapability, AuthorizationError } from "@/domain/auth/authorize";
import { currentSession } from "@/domain/auth/session-cookie";
import { createGuardian, listGuardians } from "@/domain/guardians/service";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(160).optional(),
});

async function access(schoolId: string) {
  const session = await currentSession();
  if (!session) throw new AuthorizationError("Authentication required.");
  const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.MANAGE_STUDENTS);
  await requireSchoolModule(membership.schoolId, "STUDENTS");
  return membership;
}

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const membership = await access((await params).schoolId);
    return NextResponse.json({ ok: true, guardians: await listGuardians(membership.schoolId) });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("guardian list failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const membership = await access((await params).schoolId);
    const input = schema.parse(await request.json());
    const guardian = await createGuardian({ schoolId: membership.schoolId, ...input });
    await db.auditEvent.create({
      data: {
        schoolId: membership.schoolId,
        actorUserId: membership.userId,
        action: "guardian.created",
        entityType: "Guardian",
        entityId: guardian.id,
        currentState: { fullName: guardian.fullName, phone: guardian.phone, email: guardian.email },
      },
    });
    return NextResponse.json({ ok: true, guardian }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_GUARDIAN_DATA", issues: error.issues }, { status: 400 });
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("guardian create failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
