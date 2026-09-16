import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import { getResultAccessSetting, updateResultAccessSetting } from "@/domain/commercial/result-access";

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { schoolId } = await params;
  const { db } = await import("@/lib/db");
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!membership) return NextResponse.json({ error: "SCHOOL_ACCESS_REQUIRED" }, { status: 403 });

  const setting = await getResultAccessSetting(schoolId);
  return NextResponse.json({
    resultAccess: { ...setting, amountNaira: Number(setting.amountNaira) },
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { schoolId } = await params;
  try {
    const setting = await updateResultAccessSetting(schoolId, session.user.id, await request.json());
    return NextResponse.json({
      resultAccess: { ...setting, amountNaira: Number(setting.amountNaira) },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "OWNER_REQUIRED") {
      return NextResponse.json({ error: "OWNER_REQUIRED" }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "INVALID_RESULT_ACCESS_SETTINGS" }, { status: 400 });
    }
    console.error("result access update failed", error);
    return NextResponse.json({ error: "RESULT_ACCESS_UPDATE_FAILED" }, { status: 500 });
  }
}
