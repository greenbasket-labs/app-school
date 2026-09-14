import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { requireCapability, AuthorizationError } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(2).max(40),
  order: z.number().int().min(1).max(12),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string; sessionId: string }> }) {
  const { schoolId, sessionId } = await params;
  try {
    const membership = await requireSchoolCapability(schoolId);
    const input = schema.parse(await request.json());
    if (input.endsAt <= input.startsAt) return NextResponse.json({ ok: false, error: "TERM_END_MUST_FOLLOW_START" }, { status: 400 });

    const session = await db.academicSession.findFirst({ where: { id: sessionId, schoolId: membership.schoolId } });
    if (!session) return NextResponse.json({ ok: false, error: "ACADEMIC_SESSION_NOT_FOUND" }, { status: 404 });
    if (input.startsAt < session.startsAt || input.endsAt > session.endsAt) return NextResponse.json({ ok: false, error: "TERM_OUTSIDE_SESSION" }, { status: 400 });

    const term = await db.academicTerm.create({ data: { academicSessionId: session.id, ...input } });
    await db.auditEvent.create({
      data: {
        schoolId: membership.schoolId,
        actorUserId: membership.userId,
        action: "academic_term.created",
        entityType: "AcademicTerm",
        entityId: term.id,
        currentState: { sessionId: session.id, name: term.name, order: term.order, startsAt: term.startsAt.toISOString(), endsAt: term.endsAt.toISOString() },
      },
    });
    return NextResponse.json({ ok: true, term }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "INVALID_ACADEMIC_TERM_DATA", issues: error.issues }, { status: 400 });
    if (error instanceof AuthorizationError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("academic term request failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}

async function requireSchoolCapability(schoolId: string) {
  const session = await currentSession();
  if (!session) throw new AuthorizationError("Authentication required.");
  return requireCapability(session.user.id, schoolId, CAPABILITIES.MANAGE_SCHOOL);
}
