import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import {
  createStudentFeeInvoice,
  listStudentFeeInvoices,
  listUninvoicedFeeAssignments,
  StudentFeeInvoiceConflictError,
  StudentFeeInvoiceValidationError,
} from "@/domain/finance/student-fee-invoices";

const createSchema = z.object({ studentFeeAssignmentId: z.string().uuid() });

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
    const [invoices, uninvoicedAssignments] = await Promise.all([
      listStudentFeeInvoices(schoolId),
      listUninvoicedFeeAssignments(schoolId),
    ]);
    return NextResponse.json({
      ok: true,
      invoices: invoices.map((invoice) => ({ ...invoice, amount: Number(invoice.amount) })),
      uninvoicedAssignments: uninvoicedAssignments.map((assignment) => ({ ...assignment, amount: Number(assignment.amount) })),
    });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    }
    console.error("invoice list failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    const session = await access(schoolId);
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });

    const invoice = await createStudentFeeInvoice(schoolId, parsed.data.studentFeeAssignmentId, session.user.id);
    return NextResponse.json({ ok: true, invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    }
    if (error instanceof StudentFeeInvoiceValidationError) {
      return NextResponse.json({ ok: false, error: "INVALID_INVOICE", message: error.message }, { status: 400 });
    }
    if (error instanceof StudentFeeInvoiceConflictError) {
      return NextResponse.json({ ok: false, error: "DUPLICATE_INVOICE", message: error.message }, { status: 409 });
    }
    console.error("invoice create failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
