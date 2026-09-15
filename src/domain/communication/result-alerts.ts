import { db } from "@/lib/db";
import { isSchoolModuleEnabled } from "@/domain/modules/service";
import { createNotification } from "@/domain/communication/notifications";

export async function notifyParentsOfPublishedResult(
  schoolId: string,
  assessmentId: string,
  assessmentName: string,
  actorUserId: string,
) {
  try {
    if (!(await isSchoolModuleEnabled(schoolId, "COMMUNICATION"))) return;

    const rows = await db.$queryRaw<Array<{ membershipId: string }>>`
      SELECT DISTINCT m."id" AS "membershipId"
      FROM "AssessmentScore" score
      JOIN "StudentGuardian" sg
        ON sg."studentId" = score."studentId"
       AND sg."schoolId" = score."schoolId"
      JOIN "Guardian" g
        ON g."id" = sg."guardianId"
       AND g."schoolId" = score."schoolId"
      JOIN "Membership" m
        ON m."userId" = g."userId"
       AND m."schoolId" = score."schoolId"
       AND m."status" = 'ACTIVE'
      WHERE score."schoolId" = ${schoolId}::uuid
        AND score."assessmentId" = ${assessmentId}::uuid
        AND g."userId" IS NOT NULL
    `;

    const membershipIds = rows.map((row) => row.membershipId);
    if (membershipIds.length === 0) return;

    await createNotification(
      schoolId,
      actorUserId,
      "Result published",
      `Results for ${assessmentName} are now available for your child in the school portal.`,
      membershipIds,
    );
  } catch (error) {
    console.error("published result parent notification failed", error);
  }
}
