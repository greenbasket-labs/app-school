import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";
import { PAYMENT_PROVIDERS, PaymentProviderValidationError, upsertSchoolPaymentProvider } from "@/domain/finance/payment-providers";

const schema = z.object({
  provider: z.enum(PAYMENT_PROVIDERS),
  settlementAccountReference: z.string().trim().min(1).max(160),
  enabled: z.boolean().default(true),
});

async function owner(schoolId: string) {
  const session = await currentSession();
  if (!session) return null;
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: { id: true, isOwner: true },
  });
  if (!membership?.isOwner) return null;
  return session;
}

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const schoolId = (await params).schoolId;
  const session = await owner(schoolId);
  if (!session) return NextResponse.json({ ok: false, error: "OWNER_REQUIRED" }, { status: 403 });
  const providers = await db.$queryRaw<Array<{
    id: string; provider: string; settlementAccountReference: string; enabled: boolean;
  }>>`
    SELECT "id", "provider", "settlementAccountReference", "enabled"
    FROM "SchoolPaymentProvider"
    WHERE "schoolId" = ${schoolId}::uuid
    ORDER BY "provider"
  `;
  return NextResponse.json({ ok: true, providers });
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const schoolId = (await params).schoolId;
  const session = await owner(schoolId);
  if (!session) return NextResponse.json({ ok: false, error: "OWNER_REQUIRED" }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  try {
    const provider = await upsertSchoolPaymentProvider(
      schoolId,
      parsed.data.provider,
      parsed.data.settlementAccountReference,
      session.user.id,
      parsed.data.enabled,
    );
    return NextResponse.json({ ok: true, provider });
  } catch (error) {
    if (error instanceof PaymentProviderValidationError) {
      return NextResponse.json({ ok: false, error: "INVALID_PROVIDER", message: error.message }, { status: 400 });
    }
    console.error("payment provider configuration failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
