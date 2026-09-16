import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import { changeGuardianFirstLoginPassword } from "@/domain/communication/guardian-account-security";

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
});

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  try {
    const input = schema.parse(await request.json());
    await changeGuardianFirstLoginPassword({ userId: session.userId, ...input });
    return NextResponse.json({ ok: true, requiresFirstLoginPasswordChange: false }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_PASSWORD_DATA" }, { status: 400 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "PASSWORD_CHANGE_FAILED" }, { status: 400 });
  }
}
