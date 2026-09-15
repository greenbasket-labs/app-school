import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { AcademicSessionLifecycleError, updateAcademicSessionStatus } from "@/domain/academic/session-lifecycle";
import { db } from "@/lib/db";

const schema = z.object({ status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ schoolId: string; sessionId: string }> }) {
  const { schoolId, sessionId } = await params;
  try {
    const session = await currentSession();
    if (!session) throw new AuthorizationError("Authentication required.");
    const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.MANAGE_SCHOOL);
    const input = schema.parse(await request.json());
    const current = await db.academicSession.findFirst({ where: { id: sessionId, schoolId: membership.schoolId }, select: { status: true } });
    if (!current) return NextResponse.json({ ok: false, error: "ACADEMIC_SESSION_NOT_FOUND" }, { status: 404 });
    const updated = await updateAcademicSessionStatus({ schoolId: membership.schoolId, sessionId, status: input.status });
    await db.auditEvent.create({ data: { schoolId: membership.schoolId, actorUserId: membership.userId, action: "academic_session.status_changed", entityType: "AcademicSession", entityId: updated.id, previousState: { status: current.status }, currentState: { status: updated.status } } });
    return NextResponse.json({ ok: true, session: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_SESSION_STATUS", issues: error.issues }, { status: 400 });
    if (error instanceof AcademicSessionLifecycleError) return NextResponse.json({ ok: false, error: "SESSION_LIFECYCLE_INVALID", message: error.message }, { status: 400 });
    if (error instanceof AuthorizationError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("academic session status update failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
