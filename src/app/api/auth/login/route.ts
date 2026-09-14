import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateUser, AuthenticationError } from "@/domain/auth/sign-in";
import { signIn } from "@/domain/auth/session-cookie";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const user = await authenticateUser(input.email, input.password);
    const expiresAt = await signIn(user.id);

    return NextResponse.json({ ok: true, userId: user.id, expiresAt }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "INVALID_LOGIN_DATA" }, { status: 400 });
    }
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ ok: false, error: "INVALID_CREDENTIALS" }, { status: 401 });
    }
    console.error("login failed", error);
    return NextResponse.json({ ok: false, error: "LOGIN_FAILED" }, { status: 500 });
  }
}
