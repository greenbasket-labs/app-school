import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { getGuardianNotificationPreference, setGuardianNotificationPreference } from "@/domain/communication/guardian-notifications";

const schema = z.object({ schoolId: z.string().uuid(), inAppEnabled: z.boolean(), smsEnabled: z.boolean(), emailEnabled: z.boolean(), whatsappEnabled: z.boolean() });

export async function GET(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  const schoolId = new URL(request.url).searchParams.get("schoolId");
  if (!schoolId) return NextResponse.json({ ok: false, error: "SCHOOL_ID_REQUIRED" }, { status: 400 });
  try {
    await requireSchoolModule(schoolId, "COMMUNICATION");
    return NextResponse.json(await getGuardianNotificationPreference(schoolId, session.user.id));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "REQUEST_FAILED" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    const input = schema.parse(await request.json());
    await requireSchoolModule(input.schoolId, "COMMUNICATION");
    await setGuardianNotificationPreference(input.schoolId, session.user.id, {
      inAppEnabled: input.inAppEnabled, smsEnabled: input.smsEnabled, emailEnabled: input.emailEnabled, whatsappEnabled: input.whatsappEnabled,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "REQUEST_FAILED" }, { status: 400 });
  }
}
