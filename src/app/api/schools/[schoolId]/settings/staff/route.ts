import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import {
  getSchoolStaff,
  setMembershipDisabled,
  setStaffCapabilities,
  StaffAuthorizationError,
  StaffValidationError,
} from "@/domain/staff/service";
import { CAPABILITIES } from "@/domain/auth/capabilities";

const capabilityCodes = Object.values(CAPABILITIES) as [string, ...string[]];
const updateSchema = z.object({
  membershipId: z.string().uuid(),
  capabilityCodes: z.array(z.enum(capabilityCodes)).max(capabilityCodes.length),
});
const disableSchema = z.object({ membershipId: z.string().uuid() });

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

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "STAFF_ACCOUNT_CREATION_DISABLED",
      message: "Staff accounts must use the personal-account-first school joining flow.",
    },
    { status: 410 },
  );
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

export async function DELETE(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    const input = disableSchema.parse(await request.json());
    const membership = await setMembershipDisabled({ schoolId, actorUserId: session.user.id, ...input });
    return NextResponse.json({ ok: true, membership });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_MEMBERSHIP" }, { status: 400 });
    if (error instanceof StaffAuthorizationError) return NextResponse.json({ ok: false, error: "OWNER_REQUIRED" }, { status: 403 });
    if (error instanceof StaffValidationError) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    console.error("staff disablement failed", error);
    return NextResponse.json({ ok: false, error: "STAFF_DISABLE_FAILED" }, { status: 500 });
  }
}
