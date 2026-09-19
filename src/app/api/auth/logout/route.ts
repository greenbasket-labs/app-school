import { NextResponse } from "next/server";
import { signOut } from "@/domain/auth/session-cookie";

export async function POST(request: Request) {
  await signOut();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
