import { isSchoolModuleEnabled } from "@/domain/modules/service";
import { notifyVerifiedGuardiansOfPublishedResult } from "@/domain/communication/guardian-notifications";

export async function notifyParentsOfPublishedResult(
  schoolId: string,
  assessmentId: string,
  assessmentName: string,
  actorUserId: string,
) {
  try {
    if (!(await isSchoolModuleEnabled(schoolId, "COMMUNICATION"))) return;
    await notifyVerifiedGuardiansOfPublishedResult(schoolId, assessmentId, assessmentName, actorUserId);
  } catch (error) {
    console.error("published result parent notification failed", error);
  }
}
