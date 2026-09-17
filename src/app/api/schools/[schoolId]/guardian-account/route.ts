import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";
import { requireSchoolModule } from "@/domain/modules/guard";
import {
  GuardianAccountAuthorizationError,
  removeGuardianAccountVerification,
  verifyGuardianAccount,
} from "@/domain/guardians/account-access";

const verifySchema = z.object({ guardianId: z.string().uuid() });
const removeSchema = z.object({ guardianId: z.string().uuid() });

async function requireOwner(userId: string, schoolId: string) {
  const membership = await db.membership.findFirst({
    where: { userId, schoolId, status: "ACTIVE", isOwner: true },
    select: { id: true },
  });
  if (!membership) throw new Error("OWNER_REQUIRED");
  await requireSchoolModule(schoolId, "STUDENTS");
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    await requireOwner(session.user.id, schoolId);
    const input = verifySchema.parse(await request.json());
    const guardian = await verifyGuardianAccount({ schoolId, guardianId: input.guardianId, actorUserId: session.user.id });
    return NextResponse.json({ ok: true, guardian });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_GUARDIAN_ACCOUNT_DATA" }, { status: 400 });
    if (error instanceof GuardianAccountAuthorizationError) return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    if (error instanceof Error && error.message === "OWNER_REQUIRED") return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    console.error("guardian account verification failed", error);
    return NextResponse.json({ ok: false, error: "GUARDIAN_ACCOUNT_VERIFICATION_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    await requireOwner(session.user.id, schoolId);
    const input = removeSchema.parse(await request.json());
    const guardian = await removeGuardianAccountVerification({ schoolId, ...input, actorUserId: session.user.id });
    return NextResponse.json({ ok: true, guardian });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_GUARDIAN_ACCOUNT_DATA" }, { status: 400 });
    if (error instanceof GuardianAccountAuthorizationError) return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    if (error instanceof Error && error.message === "OWNER_REQUIRED") return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    console.error("guardian account verification removal failed", error);
    return NextResponse.json({ ok: false, error: "GUARDIAN_ACCOUNT_VERIFICATION_REMOVAL_FAILED" }, { status: 500 });
  }
}
