import { isSchoolModuleEnabled } from "@/domain/modules/service";
import { createNotification } from "@/domain/communication/notifications";
import { db } from "@/lib/db";

export async function notifyParentsOfPayment(
  schoolId: string,
  studentId: string,
  actorUserId: string,
  amount: number,
  feeName: string,
  reference?: string,
) {
  if (!(await isSchoolModuleEnabled(schoolId, "COMMUNICATION"))) return;

  const rows = await db.$queryRaw<Array<{
    membershipId: string;
    firstName: string;
    lastName: string;
  }>`
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
  const referenceText = reference ? ` Reference: ${reference}.` : "";

  for (const row of rows) {
    try {
      await createNotification(
        schoolId,
        actorUserId,
        "Payment recorded",
        `A payment of ₦${amount.toFixed(2)} for ${feeName} has been recorded for ${name}.${referenceText}`,
        [row.membershipId],
      );
    } catch {
      // Payment must not fail because notification delivery could not be created.
    }
  }
}
