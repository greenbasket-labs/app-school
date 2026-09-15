import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";
import { createParentAccessInvitation, listGuardiansForAccess } from "@/domain/communication/parent-access";

const createSchema = z.object({ guardianId: z.string().uuid() });

async function ownerMembership(userId: string, schoolId: string) {
  return db.membership.findFirst({ where: { userId, schoolId, status: "ACTIVE", isOwner: true }, select: { id: true } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    await requireSchoolModule(schoolId, "COMMUNICATION");
    if (!(await ownerMembership(session.user.id, schoolId))) return NextResponse.json({ error: "OWNER_REQUIRED" }, { status: 403 });
    return NextResponse.json({ guardians: await listGuardiansForAccess(schoolId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "REQUEST_FAILED" }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    await requireSchoolModule(schoolId, "COMMUNICATION");
    if (!(await ownerMembership(session.user.id, schoolId))) return NextResponse.json({ error: "OWNER_REQUIRED" }, { status: 403 });
    const input = createSchema.parse(await request.json());
    const token = await createParentAccessInvitation(schoolId, input.guardianId, session.user.id);
    return NextResponse.json({ invitePath: `/parent/accept/${token}` }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "REQUEST_FAILED" }, { status: 400 });
  }
}
