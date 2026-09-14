import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  registerSchoolOwner,
  RegistrationConflictError,
} from "@/domain/onboarding/register-school-owner";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await registerSchoolOwner(body);

    return NextResponse.json(
      {
        ok: true,
        userId: result.user.id,
        organizationId: result.organization.id,
        schoolId: result.school.id,
        schoolCreatedAt: result.school.createdAt,
        next: "AUTHENTICATE_AND_CONTINUE_SETUP",
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
        { ok: false, error: "IDENTITY_ALREADY_REGISTERED", message: error.message },
        { status: 409 },
      );
    }

    console.error("registration failed", error);
    return NextResponse.json(
      { ok: false, error: "REGISTRATION_FAILED" },
      { status: 500 },
    );
  }
}
