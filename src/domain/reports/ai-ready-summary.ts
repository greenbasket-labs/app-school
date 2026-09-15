import { getManagementSummary } from "@/domain/reports/management-summary";
import { getOperationalAnomalies } from "@/domain/reports/anomalies";

export async function getAiReadyManagementContext(schoolId: string) {
  const [summary, anomalies] = await Promise.all([
    getManagementSummary(schoolId),
    getOperationalAnomalies(schoolId),
  ]);
  return {
    purpose: "management-assistance",
    sourceOfTruth: "school-records",
    generatedAt: summary.generatedAt,
    summary,
    anomalies,
    instruction: "Treat these records as authoritative. Do not invent missing school facts or alter records.",
  };
}
