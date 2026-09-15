import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const schoolId = (await params).schoolId;
  const url = new URL(request.url);
  const target = new URL(`/app/schools/${schoolId}/finance/payments`, url.origin);
  target.searchParams.set("provider", "flutterwave");
  target.searchParams.set("status", url.searchParams.get("status") ?? "unknown");
  if (url.searchParams.get("tx_ref")) target.searchParams.set("tx_ref", url.searchParams.get("tx_ref")!);
  return NextResponse.redirect(target);
}
