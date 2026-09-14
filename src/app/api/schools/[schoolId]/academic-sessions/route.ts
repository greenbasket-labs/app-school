import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { requireCapability, AuthorizationError } from "@/domain/auth/authorize";
import { createAcademicSession, getAcademicSessions, AcademicSessionConflictError } from "@/domain/academic/session";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().trim().min(4).max(50),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    await requireCapabilityFromSchool(schoolId, CAPABILITIES.MANAGE_SCHOOL);
    return NextResponse.json({ ok: true, sessions: await getAcademicSessions(schoolId) });
  } catch (error) {
    return authorizationResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    const membership = await requireCapabilityFromSchool(schoolId, CAPABILITIES.MANAGE_SCHOOL);
    const input = createSchema.parse(await request.json());
    const session = await createAcademicSession({ schoolId, ...input });

    await db.auditEvent.create({
      data: {
        schoolId,
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

async function requireCapabilityFromSchool(schoolId: string, capability: string) {
  const membership = await requireCapabilityFromContext(schoolId);
  const capabilityMembership = await requireCapability(membership.userId, schoolId, capability);
  return capabilityMembership;
}

async function requireCapabilityFromContext(schoolId: string) {
  const { requireSchoolContext } = await import("@/domain/auth/context");
  const { membership } = await requireSchoolContext(schoolId);
  return membership;
}

function authorizationResponse(error: unknown) {
  if (error instanceof AuthorizationError || error?.constructor?.name === "AuthenticationRequiredError" || error?.constructor?.name === "SchoolContextRequiredError") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }
  console.error("academic session request failed", error);
  return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
}
