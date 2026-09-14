import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { requireCapability, AuthorizationError } from "@/domain/auth/authorize";
import { createAcademicSession, getAcademicSessions, AcademicSessionConflictError } from "@/domain/academic/session";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().trim().min(4).max(50),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    const membership = await requireSchoolCapability(schoolId);
    return NextResponse.json({ ok: true, sessions: await getAcademicSessions(membership.schoolId) });
  } catch (error) {
    return authorizationResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    const membership = await requireSchoolCapability(schoolId);
    const input = createSchema.parse(await request.json());
    const session = await createAcademicSession({ schoolId: membership.schoolId, ...input });

    await db.auditEvent.create({
      data: {
        schoolId: membership.schoolId,
        actorUserId: membership.userId,
        action: "academic_session.created",
        entityType: "AcademicSession",
        entityId: session.id,
        currentState: { name: session.name, startsAt: session.startsAt.toISOString(), endsAt: session.endsAt.toISOString(), status: session.status },
      },
    });

    return NextResponse.json({ ok: true, session }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "INVALID_ACADEMIC_SESSION_DATA", issues: error.issues }, { status: 400 });
    if (error instanceof AcademicSessionConflictError) return NextResponse.json({ ok: false, error: "ACADEMIC_SESSION_EXISTS", message: error.message }, { status: 409 });
    return authorizationResponse(error);
  }
}

async function requireSchoolCapability(schoolId: string) {
  const session = await currentSession();
  if (!session) throw new AuthorizationError("Authentication required.");
  return requireCapability(session.user.id, schoolId, CAPABILITIES.MANAGE_SCHOOL);
}

function authorizationResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
  }
  console.error("academic session request failed", error);
  return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
}
