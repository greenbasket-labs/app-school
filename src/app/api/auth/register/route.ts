import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  PersonalRegistrationConflictError,
  registerPersonalAccount,
} from "@/domain/onboarding/register-personal-account";

export async function POST(request: Request) {
  try {
    const result = await registerPersonalAccount(await request.json());
    return NextResponse.json(
      { ok: true, userId: result.id, email: result.email },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ ok: false, error: "INVALID_REGISTRATION_DATA", issues: error.issues }, { status: 400 });
    }
    if (error instanceof PersonalRegistrationConflictError) {
      return NextResponse.json({ ok: false, error: "IDENTITY_ALREADY_REGISTERED", message: error.message }, { status: 409 });
    }
    console.error("personal registration failed", error);
    return NextResponse.json({ ok: false, error: "REGISTRATION_FAILED" }, { status: 500 });
  }
}
