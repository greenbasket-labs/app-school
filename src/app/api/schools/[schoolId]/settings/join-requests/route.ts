import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import {
  listSchoolJoinRequests,
  reviewSchoolJoinRequest,
  SCHOOL_RELATIONSHIPS,
  SchoolJoinAuthorizationError,
  SchoolJoinValidationError,
} from "@/domain/school-join/service";
import { SchoolJoinRequestStatus } from "@prisma/client";

const statusSchema = z.enum(SchoolJoinRequestStatus);
const relationship = z.enum(SCHOOL_RELATIONSHIPS);
const reviewSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["APPROVE", "REJECT"]),
  relationship: relationship.optional(),
  capabilityCodes: z.array(z.string().min(1)).max(50).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    const statusValue = new URL(request.url).searchParams.get("status") ?? undefined;
    const status = statusValue ? statusSchema.parse(statusValue) : undefined;
    const requests = await listSchoolJoinRequests({ schoolId, actorUserId: session.user.id, status });
    return NextResponse.json({ ok: true, requests });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_JOIN_REQUEST_STATUS" }, { status: 400 });
    if (error instanceof SchoolJoinAuthorizationError) return NextResponse.json({ ok: false, error: "OWNER_REQUIRED" }, { status: 403 });
    if (error instanceof SchoolJoinValidationError) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    console.error("school join request review list failed", error);
    return NextResponse.json({ ok: false, error: "JOIN_REQUEST_REVIEW_LIST_FAILED" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  const { schoolId } = await params;
  try {
    const input = reviewSchema.parse(await request.json());
    const result = await reviewSchoolJoinRequest({
      schoolId,
      actorUserId: session.user.id,
      ...input,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "INVALID_JOIN_REQUEST_REVIEW" }, { status: 400 });
    if (error instanceof SchoolJoinAuthorizationError) return NextResponse.json({ ok: false, error: "OWNER_REQUIRED" }, { status: 403 });
    if (error instanceof SchoolJoinValidationError) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    console.error("school join request review failed", error);
    return NextResponse.json({ ok: false, error: "JOIN_REQUEST_REVIEW_FAILED" }, { status: 500 });
  }
}
