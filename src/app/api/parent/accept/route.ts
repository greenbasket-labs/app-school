import { NextResponse } from "next/server";
import { z } from "zod";
import { acceptParentAccessInvitation } from "@/domain/communication/parent-access";

const schema = z.object({ token: z.string().min(20), password: z.string().min(12).max(128) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const result = await acceptParentAccessInvitation(input.token, input.password);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "REQUEST_FAILED" }, { status: 400 });
  }
}
