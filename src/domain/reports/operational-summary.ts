import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function getOperationalSummary(schoolId: string) {
  const activeSession = await db.academicSession.findFirst({
    where: {
      schoolId,
      status: "ACTIVE",
    },
    orderBy: {
      startsAt: "desc",
    },
    include: {
      terms: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  const now = new Date();

  const currentTerm =
    activeSession?.terms.find(
      (term) => now >= term.startsAt && now <= term.endsAt,
    ) ??
    activeSession?.terms[0] ??
    null;

  const [
    activeStudents,
    activeTeachingStaff,
    todayAttendance,
    financeSummary,
    termAssessmentSummary,
  ] = await Promise.all([
    db.student.count({
      where: {
        schoolId,
        status: "ACTIVE",
      },
    }),

    db.membership.count({
      where: {
        schoolId,
        status: "ACTIVE",
        isOwner: false,
        relationship: {
          in: ["TEACHER", "STAFF"],
        },
      },
    }),

    db.$queryRaw<
      Array<{
        status: string;
        count: bigint;
      }>
    >(Prisma.sql`
      SELECT
        "status",
        COUNT(*)::bigint AS "count"
      FROM "AttendanceRecord"
      WHERE
        "schoolId" = ${schoolId}::uuid
        AND "attendanceDate" = CURRENT_DATE
      GROUP BY "status"
    `),

    activeSession
      ? db.$queryRaw<
          Array<{
            invoiced: string;
            paid: string;
            outstanding: string;
            invoiceCount: bigint;
            paymentCount: bigint;
          }>
        >(Prisma.sql`
          SELECT
            COALESCE(SUM(i."amount"), 0)::text AS "invoiced",

            COALESCE(
              (
                SELECT SUM(p."amount")
                FROM "PaymentRecord" p
                INNER JOIN "StudentFeeInvoice" pi
                  ON pi."id" = p."invoiceId"
                  AND pi."schoolId" = p."schoolId"
                INNER JOIN "StudentFeeAssignment" pa
                  ON pa."id" = pi."studentFeeAssignmentId"
                  AND pa."schoolId" = pi."schoolId"
                INNER JOIN "FeeStructure" pf
                  ON pf."id" = pa."feeStructureId"
                  AND pf."schoolId" = pa."schoolId"
                WHERE
                  p."schoolId" = ${schoolId}::uuid
                  AND pf."academicSessionId" = ${activeSession.id}::uuid
              ),
              0
            )::text AS "paid",

            COALESCE(
              SUM(
                GREATEST(
                  i."amount" -
                  COALESCE(
                    (
                      SELECT SUM(p2."amount")
                      FROM "PaymentRecord" p2
                      WHERE
                        p2."invoiceId" = i."id"
                        AND p2."schoolId" = i."schoolId"
                    ),
                    0
                  ),
                  0
                )
              ),
              0
            )::text AS "outstanding",

            COUNT(DISTINCT i."id")::bigint AS "invoiceCount",

            (
              SELECT COUNT(*)::bigint
              FROM "PaymentRecord" p3
              INNER JOIN "StudentFeeInvoice" pi3
                ON pi3."id" = p3."invoiceId"
                AND pi3."schoolId" = p3."schoolId"
              INNER JOIN "StudentFeeAssignment" pa3
                ON pa3."id" = pi3."studentFeeAssignmentId"
                AND pa3."schoolId" = pi3."schoolId"
              INNER JOIN "FeeStructure" pf3
                ON pf3."id" = pa3."feeStructureId"
                AND pf3."schoolId" = pa3."schoolId"
              WHERE
                p3."schoolId" = ${schoolId}::uuid
                AND pf3."academicSessionId" = ${activeSession.id}::uuid
            ) AS "paymentCount"

          FROM "StudentFeeInvoice" i
          INNER JOIN "StudentFeeAssignment" a
            ON a."id" = i."studentFeeAssignmentId"
            AND a."schoolId" = i."schoolId"
          INNER JOIN "FeeStructure" f
            ON f."id" = a."feeStructureId"
            AND f."schoolId" = a."schoolId"
          WHERE
            i."schoolId" = ${schoolId}::uuid
            AND i."status" = 'OPEN'
            AND f."academicSessionId" = ${activeSession.id}::uuid
        `)
      : Promise.resolve([
          {
            invoiced: "0",
            paid: "0",
            outstanding: "0",
            invoiceCount: 0n,
            paymentCount: 0n,
          },
        ]),

    currentTerm
      ? db.$queryRaw<
          Array<{
            assessments: bigint;
            scores: bigint;
          }>
        >(Prisma.sql`
          SELECT
            (
              SELECT COUNT(*)::bigint
              FROM "AssessmentDefinition" ad
              WHERE
                ad."schoolId" = ${schoolId}::uuid
                AND ad."academicSessionId" = ${activeSession!.id}::uuid
                AND ad."academicTermId" = ${currentTerm.id}::uuid
            ) AS "assessments",

            (
              SELECT COUNT(*)::bigint
              FROM "AssessmentScore" s
              INNER JOIN "AssessmentDefinition" ad
                ON ad."id" = s."assessmentId"
              WHERE
                s."schoolId" = ${schoolId}::uuid
                AND s."academicSessionId" = ${activeSession!.id}::uuid
                AND ad."academicTermId" = ${currentTerm.id}::uuid
            ) AS "scores"
        `)
      : Promise.resolve([
          {
            assessments: 0n,
            scores: 0n,
          },
        ]),
  ]);

  const attendance = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  };

  for (const row of todayAttendance) {
    const status = row.status.toLowerCase();

    if (status === "present") {
      attendance.present = Number(row.count);
    }

    if (status === "absent") {
      attendance.absent = Number(row.count);
    }

    if (status === "late") {
      attendance.late = Number(row.count);
    }

    if (status === "excused") {
      attendance.excused = Number(row.count);
    }
  }

  const attendanceRecorded =
    attendance.present +
    attendance.absent +
    attendance.late +
    attendance.excused;

  const attendanceRate =
    attendanceRecorded > 0
      ? ((attendance.present + attendance.late) / attendanceRecorded) * 100
      : 0;

  const finance = financeSummary[0];

  const invoiced = Number(finance?.invoiced ?? 0);
  const paid = Number(finance?.paid ?? 0);
  const outstanding = Number(finance?.outstanding ?? 0);

  const feeCollectionRate =
    invoiced > 0 ? (paid / invoiced) * 100 : 0;

  const assessments = Number(
    termAssessmentSummary[0]?.assessments ?? 0,
  );

  const scores = Number(
    termAssessmentSummary[0]?.scores ?? 0,
  );

  const resultsProcessed =
    assessments > 0
      ? Math.min((scores / assessments) * 100, 100)
      : 0;

  return {
    activeStudents,
    activeStaff: activeTeachingStaff,

    activeSession: activeSession
      ? {
          id: activeSession.id,
          name: activeSession.name,
        }
      : null,

    currentTerm: currentTerm
      ? {
          id: currentTerm.id,
          name: currentTerm.name,
        }
      : null,

    attendanceRecordedToday: attendanceRecorded,
    attendancePresentToday: attendance.present,
    attendanceAbsentToday: attendance.absent,
    attendanceLateToday: attendance.late,
    attendanceExcusedToday: attendance.excused,
    attendanceRate: Number(attendanceRate.toFixed(1)),

    invoiceCount: Number(finance?.invoiceCount ?? 0),

    // Backward-compatible field used by existing dashboard/report pages.
    openInvoices: Number(finance?.invoiceCount ?? 0),

    paymentCount: Number(finance?.paymentCount ?? 0),

    sessionInvoiced: invoiced,
    sessionPayments: paid,
    outstandingAmount: outstanding,
    feeCollectionRate: Number(feeCollectionRate.toFixed(1)),

    assessmentsThisTerm: assessments,
    scoresThisTerm: scores,
    resultsProcessed: Number(resultsProcessed.toFixed(1)),
  };
}