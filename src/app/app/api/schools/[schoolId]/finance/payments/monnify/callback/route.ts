import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const schoolId = (await params).schoolId;
  const url = new URL(request.url);
  const status = url.searchParams.get("paymentStatus") ?? "UNKNOWN";
  const reference = url.searchParams.get("paymentReference") ?? "";
  return NextResponse.redirect(new URL(`/app/schools/${schoolId}/finance/payments?provider=monnify&status=${encodeURIComponent(status)}&paymentReference=${encodeURIComponent(reference)}`, url.origin));
}
