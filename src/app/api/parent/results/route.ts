import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import { ParentResultAccessError, authorizeGuardianResultAccess } from "@/domain/communication/parent-result-access";

const querySchema = z.object({
  studentId: z.string().uuid(),
  academicSessionId: z.string().uuid(),
  academicTermId: z.string().uuid(),
});

export async function GET(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_RESULT_QUERY" }, { status: 400 });

  try {
    const access = await authorizeGuardianResultAccess({ userId: session.userId, ...parsed.data });

    if (!access.decision.allowed) {
      if (access.decision.reason === "PAYMENT_REQUIRED") {
        return NextResponse.json({ ok: false, error: "PAYMENT_REQUIRED" }, { status: 402 });
      }
      return NextResponse.json({ ok: false, error: access.decision.reason }, { status: 403 });
    }

    return NextResponse.json({ ok: true, access: access.decision.reason, result: access.result }, { status: 200 });
  } catch (error) {
    if (error instanceof ParentResultAccessError) {
      const status = error.code === "GUARDIAN_NOT_VERIFIED" ? 403 : 404;
      return NextResponse.json({ ok: false, error: error.code }, { status });
    }
    console.error("parent result access failed", error);
    return NextResponse.json({ ok: false, error: "RESULT_ACCESS_FAILED" }, { status: 500 });
  }
}
