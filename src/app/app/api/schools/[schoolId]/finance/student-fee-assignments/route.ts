import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { assignFeeToStudent, getStudentFeeAssignmentOptions, listStudentFeeAssignments, StudentFeeAssignmentConflictError, StudentFeeAssignmentValidationError } from "@/domain/finance/student-fee-assignments";

const bodySchema = z.object({ studentId: z.string().uuid(), feeStructureId: z.string().uuid() });

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
    const [assignments, options] = await Promise.all([listStudentFeeAssignments(schoolId), getStudentFeeAssignmentOptions(schoolId)]);
    return NextResponse.json({ ok: true, assignments, options });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("student fee assignment list failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const session = await access(schoolId);
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
    const assignment = await assignFeeToStudent(schoolId, parsed.data.studentId, parsed.data.feeStructureId, session.user.id);
    return NextResponse.json({ ok: true, assignment }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    if (error instanceof StudentFeeAssignmentValidationError) return NextResponse.json({ ok: false, error: "INVALID_ASSIGNMENT", message: error.message }, { status: 400 });
    if (error instanceof StudentFeeAssignmentConflictError) return NextResponse.json({ ok: false, error: "DUPLICATE_ASSIGNMENT", message: error.message }, { status: 409 });
    console.error("student fee assignment create failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
