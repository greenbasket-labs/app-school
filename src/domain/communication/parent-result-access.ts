import { db } from "@/lib/db";
import { getPublishedReportCard } from "@/domain/assessments/report-card";
import { getResultAccessPolicy } from "@/domain/commercial/result-access";
import { hasResultAccessEntitlement } from "@/domain/commercial/result-access-entitlements";
import { evaluateResultAccess, type ResultAccessDecision } from "@/domain/commercial/result-access-policy";
import { getGuardianAccountSecurityByUserId } from "./guardian-account-security";

export class ParentResultAccessError extends Error {
  constructor(public readonly code: "GUARDIAN_NOT_VERIFIED" | "STUDENT_NOT_AUTHORIZED") {
    super(code);
    this.name = "ParentResultAccessError";
  }
}

export async function getGuardianAuthorizedStudents(userId: string) {
  const security = await getGuardianAccountSecurityByUserId(userId);
  if (!security || security.mustChangePassword || (!security.emailVerifiedAt && !security.phoneVerifiedAt)) {
    throw new ParentResultAccessError("GUARDIAN_NOT_VERIFIED");
  }

  return db.$queryRaw<Array<{
    studentId: string;
    admissionNumber: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    schoolId: string;
    relationship: string | null;
    isPrimary: boolean;
  }>`
    SELECT sg."studentId", s."admissionNumber", s."firstName", s."middleName", s."lastName",
           sg."schoolId", sg."relationship", sg."isPrimary"
    FROM "StudentGuardian" sg
    JOIN "Guardian" g ON g."id" = sg."guardianId" AND g."schoolId" = sg."schoolId"
    JOIN "Student" s ON s."id" = sg."studentId" AND s."schoolId" = sg."schoolId"
    WHERE g."userId" = ${userId}::uuid
    ORDER BY s."lastName", s."firstName"
  `;
}

export async function authorizeGuardianResultAccess(input: {
  userId: string;
  studentId: string;
  academicSessionId: string;
  academicTermId: string;
}): Promise<{
  schoolId: string;
  decision: ResultAccessDecision;
  result: Awaited<ReturnType<typeof getPublishedReportCard>> | null;
}> {
  const security = await getGuardianAccountSecurityByUserId(input.userId);
  if (!security || security.mustChangePassword || (!security.emailVerifiedAt && !security.phoneVerifiedAt)) {
    throw new ParentResultAccessError("GUARDIAN_NOT_VERIFIED");
  }

  const relationships = await db.$queryRaw<Array<{ schoolId: string }>>`
    SELECT sg."schoolId"
    FROM "StudentGuardian" sg
    JOIN "Guardian" g ON g."id" = sg."guardianId" AND g."schoolId" = sg."schoolId"
    JOIN "Student" s ON s."id" = sg."studentId" AND s."schoolId" = sg."schoolId"
    WHERE g."userId" = ${input.userId}::uuid
      AND sg."studentId" = ${input.studentId}::uuid
    LIMIT 1
  `;
  const relationship = relationships[0];
  if (!relationship) throw new ParentResultAccessError("STUDENT_NOT_AUTHORIZED");

  const schoolId = relationship.schoolId;
  const result = await getPublishedReportCard(schoolId, input.studentId, input.academicSessionId, input.academicTermId);
  const resultPublished = result.assessments.length > 0;
  const settings = await getResultAccessPolicy(schoolId);
  const entitled = await hasResultAccessEntitlement({ schoolId, studentId: input.studentId, academicSessionId: input.academicSessionId, academicTermId: input.academicTermId });
  const decision = evaluateResultAccess({
    schoolAuthorized: true,
    studentAuthorized: true,
    resultPublished,
    settings,
    entitled,
  });

  return { schoolId, decision, result: decision.allowed ? result : null };
}
