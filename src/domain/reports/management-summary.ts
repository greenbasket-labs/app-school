import { getOperationalSummary } from "@/domain/reports/operational-summary";
import { db } from "@/lib/db";

export async function getManagementSummary(schoolId: string) {
  const [operations, school] = await Promise.all([
    getOperationalSummary(schoolId),
    db.school.findUnique({ where: { id: schoolId }, select: { name: true, status: true, setupStatus: true } }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    school: school ?? { name: "", status: "SETUP", setupStatus: "NOT_STARTED" },
    operations,
  };
}
