import { NextResponse } from "next/server";
import { currentSession } from "@/domain/auth/session-cookie";
import { getSchoolProfile, updateSchoolProfile } from "@/domain/schools/profile";

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  const membership = await getMembership(session.user.id, schoolId);
  if (!membership) return NextResponse.json({ error: "SCHOOL_ACCESS_REQUIRED" }, { status: 403 });
  const profile = await getSchoolProfile(schoolId);
  return NextResponse.json({ profile });
}

export async function PUT(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    const body = await request.json();
    const profile = await updateSchoolProfile(schoolId, session.user.id, body);
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof Error && error.message === "OWNER_REQUIRED") return NextResponse.json({ error: "OWNER_REQUIRED" }, { status: 403 });
    if (error instanceof Error && error.message === "SCHOOL_NOT_FOUND") return NextResponse.json({ error: "SCHOOL_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ error: "INVALID_PROFILE" }, { status: 400 });
  }
}

async function getMembership(userId: string, schoolId: string) {
  const { db } = await import("@/lib/db");
  return db.membership.findFirst({ where: { userId, schoolId, status: "ACTIVE" }, select: { id: true } });
}
