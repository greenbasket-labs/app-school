import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import { getGuardianAccountSecurityByUserId, verifyGuardianPhoneToken } from "@/domain/communication/guardian-account-security";

const verifySchema = z.object({ token: z.string().min(20) });

export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  const security = await getGuardianAccountSecurityByUserId(session.userId);
  if (!security) return NextResponse.json({ ok: false, error: "GUARDIAN_ACCOUNT_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    emailVerified: Boolean(security.emailVerifiedAt),
    phoneVerified: Boolean(security.phoneVerifiedAt),
    requiresFirstLoginPasswordChange: security.mustChangePassword,
  });
}

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  try {
    const input = verifySchema.parse(await request.json());
    await verifyGuardianPhoneToken(session.userId, input.token);
    return NextResponse.json({ ok: true, phoneVerified: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_VERIFICATION_DATA" }, { status: 400 });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "VERIFICATION_FAILED" }, { status: 400 });
  }
}
