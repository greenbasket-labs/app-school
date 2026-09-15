import { getOperationalSummary } from "@/domain/reports/operational-summary";
import { getSetupReadiness } from "@/domain/school-structure/setup-readiness";

export async function getManagementSummary(schoolId: string) {
  const [operations, readiness] = await Promise.all([
    getOperationalSummary(schoolId),
    getSetupReadiness(schoolId),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    operations,
    setup: readiness,
  };
}
