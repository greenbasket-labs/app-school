import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireCapability } from "@/domain/auth/authorize";
import { requireSchoolModule } from "@/domain/modules/guard";
import { createNotification, listInAppNotifications } from "@/domain/communication/notifications";
import { db } from "@/lib/db";

const createSchema = z.object({ title: z.string().min(1).max(200), body: z.string().min(1).max(5000), membershipIds: z.array(z.string().uuid()).min(1).max(500) });

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    await requireSchoolModule(schoolId, "COMMUNICATION");
    const membership = await db.membership.findFirst({ where: { userId: session.user.id, schoolId, status: "ACTIVE" }, select: { id: true } });
    if (!membership) return NextResponse.json({ error: "SCHOOL_MEMBERSHIP_REQUIRED" }, { status: 403 });
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
    await requireCapability(session.user.id, schoolId, "COMMUNICATION.SEND");
    const input = createSchema.parse(await request.json());
    const id = await createNotification(schoolId, session.user.id, input.title, input.body, input.membershipIds);
    const notification = await db.$queryRaw<Array<{ id: string; title: string; body: string; createdAt: Date }>>`
      SELECT "id", "title", "body", "createdAt"
      FROM "Notification"
      WHERE "id" = ${id}::uuid AND "schoolId" = ${schoolId}::uuid
    `;
    const row = notification[0];
    if (!row) return NextResponse.json({ error: "NOTIFICATION_ACKNOWLEDGEMENT_MISSING" }, { status: 500 });

    const recipients = await db.$queryRaw<Array<{ membershipId: string }>>`
      SELECT "membershipId" FROM "NotificationRecipient"
      WHERE "notificationId" = ${id}::uuid
      ORDER BY "membershipId"
    `;

    return NextResponse.json({
      ok: true,
      notification: {
        id: row.id,
        title: row.title,
        body: row.body,
        membershipIds: recipients.map((r) => r.membershipId),
        channel: "IN_APP",
        createdAt: row.createdAt.toISOString(),
        serverVersion: row.id,
      },
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "REQUEST_FAILED" }, { status: 400 });
  }
}
