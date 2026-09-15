import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import { createSchoolStaff, getSchoolStaff, setStaffCapabilities, StaffAuthorizationError, StaffValidationError } from "@/domain/staff/service";
import { CAPABILITIES } from "@/domain/auth/capabilities";

const capabilityCodes = Object.values(CAPABILITIES) as [string, ...string[]];
const createSchema = z.object({ email: z.string().email(), password: z.string().min(12).max(128), capabilityCodes: z.array(z.enum(capabilityCodes)).max(capabilityCodes.length) });
const updateSchema = z.object({ membershipId: z.string().uuid(), capabilityCodes: z.array(z.enum(capabilityCodes)).max(capabilityCodes.length) });

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    const staff = await getSchoolStaff(schoolId);
    return NextResponse.json({ ok: true, staff, capabilities: Object.values(CAPABILITIES) });
  } catch (error) {
    console.error("staff settings read failed", error);
    return NextResponse.json({ ok: false, error: "STAFF_SETTINGS_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    const input = createSchema.parse(await request.json());
    const staff = await createSchoolStaff({ schoolId, actorUserId: session.user.id, ...input });
    return NextResponse.json({ ok: true, staff }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_STAFF" }, { status: 400 });
    if (error instanceof StaffAuthorizationError) return NextResponse.json({ ok: false, error: "OWNER_REQUIRED" }, { status: 403 });
    if (error instanceof StaffValidationError) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    console.error("staff creation failed", error);
    return NextResponse.json({ ok: false, error: "STAFF_CREATE_FAILED" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    const input = updateSchema.parse(await request.json());
    const capabilityCodes = await setStaffCapabilities({ schoolId, actorUserId: session.user.id, ...input });
    return NextResponse.json({ ok: true, membershipId: input.membershipId, capabilityCodes });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_STAFF_ACCESS" }, { status: 400 });
    if (error instanceof StaffAuthorizationError) return NextResponse.json({ ok: false, error: "OWNER_REQUIRED" }, { status: 403 });
    if (error instanceof StaffValidationError) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    console.error("staff access update failed", error);
    return NextResponse.json({ ok: false, error: "STAFF_ACCESS_UPDATE_FAILED" }, { status: 500 });
  }
}
