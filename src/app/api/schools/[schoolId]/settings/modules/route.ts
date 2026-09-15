import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import { getSchoolModules, setSchoolModule, ModuleAuthorizationError } from "@/domain/modules/service";
import { MODULE_CATALOG } from "@/domain/modules/catalog";

const bodySchema = z.object({
  code: z.enum(MODULE_CATALOG.map((module) => module.code) as [string, ...string[]]),
  enabled: z.boolean(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    return NextResponse.json({ ok: true, modules: await getSchoolModules(schoolId) });
  } catch (error) {
    console.error("module settings read failed", error);
    return NextResponse.json({ ok: false, error: "MODULE_SETTINGS_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    const input = bodySchema.parse(await request.json());
    await setSchoolModule({ schoolId, userId: session.user.id, code: input.code as never, enabled: input.enabled });
    return NextResponse.json({ ok: true, modules: await getSchoolModules(schoolId) });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_MODULE_SETTING" }, { status: 400 });
    if (error instanceof ModuleAuthorizationError) return NextResponse.json({ ok: false, error: "OWNER_REQUIRED" }, { status: 403 });
    console.error("module setting update failed", error);
    return NextResponse.json({ ok: false, error: "MODULE_SETTING_FAILED" }, { status: 500 });
  }
}
