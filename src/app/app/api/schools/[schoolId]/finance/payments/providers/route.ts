import { NextResponse } from "next/server";
import { currentSession } from "@/domain/auth/session-cookie";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  const schoolId = (await params).schoolId;
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: { capabilities: { select: { capability: { select: { code: true } } } } },
  });
  if (!membership) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  if (!new Set(membership.capabilities.map(({ capability }) => capability.code)).has(CAPABILITIES.MANAGE_FINANCE)) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  await requireSchoolModule(schoolId, "FINANCE");
  const providers = await db.$queryRaw<Array<{ provider: string }>>`
    SELECT "provider" FROM "SchoolPaymentProvider"
    WHERE "schoolId" = ${schoolId}::uuid AND "enabled" = true
    ORDER BY "provider"
  `;
  return NextResponse.json({ ok: true, providers: providers.map(({ provider }) => provider) });
}
