import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireCapability } from "@/domain/auth/authorize";
import { requireSchoolModule } from "@/domain/modules/guard";
import { createNotification, listInAppNotifications } from "@/domain/communication/notifications";
import { replayOrRecordIdempotentResult } from "@/domain/platform/sync-server";
import { db } from "@/lib/db";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  membershipIds: z.array(z.string().uuid()).min(1).max(500),
});

async function access(schoolId: string) {
  const session = await currentSession();
  if (!session) return { session: null, error: NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }) };

  await requireSchoolModule(schoolId, "COMMUNICATION");
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!membership) {
    return { session, error: NextResponse.json({ error: "SCHOOL_MEMBERSHIP_REQUIRED" }, { status: 403 }) };
  }

  return { session, error: null };
}

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    const result = await access(schoolId);
    if (result.error) return result.error;

    const membership = await db.membership.findFirst({
      where: { userId: result.session!.user.id, schoolId, status: "ACTIVE" },
      select: { id: true },
    });
    return NextResponse.json({ notifications: await listInAppNotifications(schoolId, membership!.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "REQUEST_FAILED" }, { status: 403 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  try {
    const result = await access(schoolId);
    if (result.error) return result.error;

    await requireCapability(result.session!.user.id, schoolId, "COMMUNICATION.SEND");
    const input = createSchema.parse(await request.json());
    const idempotencyKey = request.headers.get("Idempotency-Key");

    const execute = async () => {
      const id = await createNotification(schoolId, result.session!.user.id, input.title, input.body, input.membershipIds);
      const rows = await db.$queryRaw<Array<{ id: string; title: string; body: string; createdAt: Date }>>`
        SELECT "id", "title", "body", "createdAt"
        FROM "Notification"
        WHERE "id" = ${id}::uuid AND "schoolId" = ${schoolId}::uuid
        LIMIT 1
      `;
      const notification = rows[0];
      if (!notification) throw new Error("Created notification could not be reloaded.");

      return {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        membershipIds: input.membershipIds,
        channel: "IN_APP" as const,
        createdAt: notification.createdAt.toISOString(),
        serverVersion: notification.id,
      };
    };

    const resultWithReplay = idempotencyKey
      ? await replayOrRecordIdempotentResult({
          schoolId,
          operation: "communication.notification.create",
          key: idempotencyKey,
          execute,
        })
      : { replayed: false, result: await execute() };

    return NextResponse.json(
      { ok: true, notification: resultWithReplay.result, replayed: resultWithReplay.replayed },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ ok: false, error: "INVALID_NOTIFICATION", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "REQUEST_FAILED" },
      { status: 400 },
    );
  }
}
