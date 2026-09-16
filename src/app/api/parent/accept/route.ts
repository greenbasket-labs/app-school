import { NextResponse } from "next/server";
import { z } from "zod";
import { acceptParentAccessInvitation } from "@/domain/communication/parent-access";
import { signIn } from "@/domain/auth/session-cookie";

const schema = z.object({ token: z.string().min(20) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const result = await acceptParentAccessInvitation(input.token);
    await signIn(result.userId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "REQUEST_FAILED" }, { status: 400 });
  }
}
