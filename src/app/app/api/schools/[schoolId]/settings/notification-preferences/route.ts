import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { getNotificationPreference, setNotificationPreference } from "@/domain/communication/notifications";
import { db } from "@/lib/db";

const schema = z.object({ inAppEnabled: z.boolean(), smsEnabled: z.boolean(), emailEnabled: z.boolean(), whatsappEnabled: z.boolean() });

async function membershipFor(userId: string, schoolId: string) {
  return db.membership.findFirst({ where: { userId, schoolId, status: "ACTIVE" }, select: { id: true } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    await requireSchoolModule(schoolId, "COMMUNICATION");
    const membership = await membershipFor(session.user.id, schoolId);
    if (!membership) return NextResponse.json({ error: "SCHOOL_MEMBERSHIP_REQUIRED" }, { status: 403 });
    return NextResponse.json(await getNotificationPreference(membership.id));
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
    const membership = await membershipFor(session.user.id, schoolId);
    if (!membership) return NextResponse.json({ error: "SCHOOL_MEMBERSHIP_REQUIRED" }, { status: 403 });
    const preference = schema.parse(await request.json());
    await setNotificationPreference(membership.id, preference);
    return NextResponse.json(preference);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "REQUEST_FAILED" }, { status: 400 });
  }
}
