import { NextResponse } from "next/server";
import { signOut } from "@/domain/auth/session-cookie";

export async function POST() {
  await signOut();
  return NextResponse.json({ ok: true });
}
