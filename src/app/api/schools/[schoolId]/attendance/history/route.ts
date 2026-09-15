import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";

const querySchema = z.object({
  academicSessionId: z.string().uuid(),
  classArmId: z.string().uuid(),
  from: z.coerce.date(),
  to: z.coerce.date(),
}).refine((value) => value.from <= value.to, { message: "The start date must be on or before the end date.", path: ["from"] });

async function access(schoolId: string) {
  const session = await currentSession();
  if (!session) throw new AuthorizationError("Authentication required.");
  const membership = await requireCapability(session.user.id, schoolId, CAPABILITIES.VIEW_ATTENDANCE);
  await requireSchoolModule(membership.schoolId, "ATTENDANCE");
  return { session, membership };
}

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  try {
    const schoolId = (await params).schoolId;
    await access(schoolId);
    const url = new URL(request.url);
    const input = querySchema.parse({
      academicSessionId: url.searchParams.get("academicSessionId"),
      classArmId: url.searchParams.get("classArmId"),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });

    const records = await db.attendanceRecord.findMany({
      where: {
        schoolId,
        academicSessionId: input.academicSessionId,
        classArmId: input.classArmId,
        attendanceDate: { gte: input.from, lte: input.to },
      },
      select: {
        id: true,
        studentId: true,
        enrollmentId: true,
        attendanceDate: true,
        status: true,
        note: true,
        recordedByUserId: true,
        recordedAt: true,
        student: { select: { admissionNumber: true, firstName: true, middleName: true, lastName: true } },
      },
      orderBy: [{ attendanceDate: "desc" }, { student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    });

    return NextResponse.json({ ok: true, records });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ ok: false, error: "INVALID_ATTENDANCE_HISTORY_QUERY", issues: error.issues }, { status: 400 });
    if (error instanceof AuthorizationError || error instanceof ModuleDisabledError) return NextResponse.json({ ok: false, error: "FORBIDDEN", message: error.message }, { status: 403 });
    console.error("attendance history failed", error);
    return NextResponse.json({ ok: false, error: "REQUEST_FAILED" }, { status: 500 });
  }
}
