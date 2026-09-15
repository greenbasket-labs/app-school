import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") ?? "";
  const destination = new URL(`/app/schools/${schoolId}/finance/payments`, url.origin);
  if (reference) destination.searchParams.set("reference", reference);
  destination.searchParams.set("payment", "return");
  return NextResponse.redirect(destination);
}
