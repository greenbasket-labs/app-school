import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { createFeeStructure, FeeStructureConflictError, FeeStructureValidationError, getFeeStructureOptions, listFeeStructures } from "@/domain/finance/fee-structures";

const createSchema = z.object({
  academicSessionId: z.string().uuid(),
  academicTermId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  amount: z.number().positive().max(100_000_000),
  description: z.string().max(500).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

async function access(schoolId: string) {
  const session = await currentSession();
  if (!session) throw new AuthorizationError("Authentication required.");
  const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.MANAGE_FINANCE);
  await requireSchoolModule(membership.schoolId, "FINANCE");
  return session;
}

export async function GET(_request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    await access(schoolId);
    const [feeStructures, options] = await Promise.all([
      listFeeStructures(schoolId),
      getFeeStructureOptions(schoolId),
    ]);
    return NextResponse.json({ ok: true, feeStructures, options });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    }
    console.error("fee structure list failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const session = await access(schoolId);
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });

    const feeStructure = await createFeeStructure({ schoolId, ...parsed.data }, session.user.id);
    return NextResponse.json({ ok: true, feeStructure }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    }
    if (error instanceof FeeStructureValidationError) {
      return NextResponse.json({ ok: false, error: "INVALID_FEE_STRUCTURE", message: error.message }, { status: 400 });
    }
    if (error instanceof FeeStructureConflictError) {
      return NextResponse.json({ ok: false, error: "DUPLICATE_FEE_STRUCTURE", message: error.message }, { status: 409 });
    }
    console.error("fee structure create failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
