import { NextResponse } from "next/server";
import { currentSession } from "@/domain/auth/session-cookie";
import { listRules, upsertRule } from "@/domain/platform/rules";
import { db } from "@/lib/db";

async function owner(schoolId: string) {
  const session = await currentSession();
  if (!session) return null;
  return db.membership.findFirst({ where: { userId: session.user.id, schoolId, status: "ACTIVE", isOwner: true }, select: { userId: true } });
}

export async function GET(_: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  if (!(await owner(schoolId))) return NextResponse.json({ error: "OWNER_REQUIRED" }, { status: 403 });
  return NextResponse.json({ rules: await listRules(schoolId) });
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  const membership = await owner(schoolId);
  if (!membership) return NextResponse.json({ error: "OWNER_REQUIRED" }, { status: 403 });
  const body = await request.json().catch(() => null) as { code?: string; name?: string; enabled?: boolean; config?: unknown } | null;
  if (!body?.code || !body.name || typeof body.enabled !== "boolean") return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  return NextResponse.json({ rule: await upsertRule({ schoolId, userId: membership.userId, code: body.code, name: body.name, enabled: body.enabled, config: body.config }) });
}
