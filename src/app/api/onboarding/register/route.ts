import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import {
  registerSchoolOwner,
  RegistrationConflictError,
} from "@/domain/onboarding/register-school-owner";

export async function POST(request: Request) {
  try {
    const session = await currentSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "AUTHENTICATION_REQUIRED", message: "Sign in to your SkulGo account before registering a school." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const result = await registerSchoolOwner({
      ...body,
      existingUserId: session.user.id,
    });

    return NextResponse.json(
      {
        ok: true,
        userId: result.user.id,
        organizationId: result.organization.id,
        schoolId: result.school.id,
        schoolCreatedAt: result.school.createdAt,
        next: "SCHOOL_WORKSPACE",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: "INVALID_REGISTRATION_DATA", issues: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof RegistrationConflictError) {
      return NextResponse.json(
        { ok: false, error: "REGISTRATION_CONFLICT", message: error.message },
        { status: 409 },
      );
    }

    console.error("school registration failed", error);
    return NextResponse.json(
      { ok: false, error: "REGISTRATION_FAILED" },
      { status: 500 },
    );
  }
}
