import { NextResponse } from "next/server";
import { z } from "zod";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireCapability } from "@/domain/auth/authorize";
import { requireSchoolModule } from "@/domain/modules/guard";
import { createNotification, listInAppNotifications, listSchoolRecipients } from "@/domain/communication/notifications";

const createSchema = z.object({ title: z.string().min(1).max(200), body: z.string().min(1).max(5000), membershipIds: z.array(z.string().uuid()).min(1).max(500) });

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    await requireSchoolModule(schoolId, "COMMUNICATION");
    const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.VIEW_STUDENTS);
    return NextResponse.json({ notifications: await listInAppNotifications(schoolId, membership.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "REQUEST_FAILED" }, { status: 403 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    await requireSchoolModule(schoolId, "COMMUNICATION");
    await requireCapability(session.user.id, schoolId, CAPABILITIES.SEND_COMMUNICATION);
    const input = createSchema.parse(await request.json());
    const id = await createNotification(schoolId, session.user.id, input.title, input.body, input.membershipIds);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "REQUEST_FAILED" }, { status: 400 });
  }
}
