import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import {
  cancelSchoolJoinRequest,
  createSchoolJoinRequest,
  listMySchoolJoinRequests,
  SCHOOL_RELATIONSHIPS,
  SchoolJoinValidationError,
} from "@/domain/school-join/service";

const relationship = z.enum(SCHOOL_RELATIONSHIPS);
const createSchema = z.object({
  requestedRelationship: relationship,
  requestedCapabilities: z.array(z.string().min(1)).max(50).optional(),
  message: z.string().max(1000).optional(),
});
const cancelSchema = z.object({ requestId: z.string().uuid() });

export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    const requests = await listMySchoolJoinRequests({ userId: session.user.id });
    return NextResponse.json({ ok: true, requests });
  } catch (error) {
    if (error instanceof SchoolJoinValidationError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    console.error("join request list failed", error);
    return NextResponse.json({ ok: false, error: "JOIN_REQUEST_LIST_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    const input = createSchema.parse(await request.json());
    const joinRequest = await createSchoolJoinRequest({
      schoolId,
      userId: session.user.id,
      ...input,
    });
    return NextResponse.json({ ok: true, request: joinRequest }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_JOIN_REQUEST" }, { status: 400 });
    if (error instanceof SchoolJoinValidationError) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    console.error("join request creation failed", error);
    return NextResponse.json({ ok: false, error: "JOIN_REQUEST_CREATE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    const input = cancelSchema.parse(await request.json());
    const joinRequest = await cancelSchoolJoinRequest({ requestId: input.requestId, userId: session.user.id });
    return NextResponse.json({ ok: true, request: joinRequest });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_JOIN_REQUEST" }, { status: 400 });
    if (error instanceof SchoolJoinValidationError) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    console.error("join request cancellation failed", error);
    return NextResponse.json({ ok: false, error: "JOIN_REQUEST_CANCEL_FAILED" }, { status: 500 });
  }
}
