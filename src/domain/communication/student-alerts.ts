import { isSchoolModuleEnabled } from "@/domain/modules/service";
import { db } from "@/lib/db";
import { createNotification } from "@/domain/communication/notifications";

export async function notifyParentsOfAbsence(
  schoolId: string,
  studentId: string,
  actorUserId: string,
  attendanceDate: Date,
) {
  if (!(await isSchoolModuleEnabled(schoolId, "COMMUNICATION"))) return;

  const rows = await db.$queryRaw<Array<{
    membershipId: string;
    firstName: string;
    lastName: string;
  }>>`
    SELECT DISTINCT m."id" AS "membershipId", s."firstName", s."lastName"
    FROM "StudentGuardian" sg
    JOIN "Guardian" g ON g."id" = sg."guardianId" AND g."schoolId" = ${schoolId}::uuid
    JOIN "Membership" m ON m."userId" = g."userId"
      AND m."schoolId" = ${schoolId}::uuid
      AND m."status" = 'ACTIVE'
    JOIN "Student" s ON s."id" = sg."studentId"
    WHERE sg."schoolId" = ${schoolId}::uuid
      AND sg."studentId" = ${studentId}::uuid
      AND g."userId" IS NOT NULL
  `;

  if (rows.length === 0) return;

  const name = `${rows[0].firstName} ${rows[0].lastName}`.trim();
  const date = attendanceDate.toISOString().slice(0, 10);

  for (const row of rows) {
    try {
      await createNotification(
        schoolId,
        actorUserId,
        "Attendance alert",
        `${name} was marked absent on ${date}. Please check with the school if this was unexpected.`,
        [row.membershipId],
      );
    } catch {
      // Attendance must not fail because notification delivery could not be created.
    }
  }
}
