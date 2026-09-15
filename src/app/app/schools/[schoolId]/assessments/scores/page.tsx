import { redirect } from "next/navigation";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { getAssessmentDefinitionOptions, listAssessmentDefinitions } from "@/domain/assessments/service";
import { ModuleDisabledError, requireSchoolModule } from "@/domain/modules/guard";
import ScoreCaptureWorkspace from "./workspace";

export default async function AssessmentScoresPage({ params, searchParams }: { params: Promise<{ schoolId: string }>; searchParams: Promise<{ assessmentId?: string }> }) {
  const schoolId = (await params).schoolId;
  const query = await searchParams;
  try {
    const session = await currentSession();
    if (!session) redirect("/login");
    await requireCapability(session.user.id, schoolId, CAPABILITIES.CREATE_ASSESSMENT);
    await requireSchoolModule(schoolId, "ASSESSMENTS");
    const [assessments, options] = await Promise.all([listAssessmentDefinitions(schoolId), getAssessmentDefinitionOptions(schoolId)]);
    const selectedId = query.assessmentId && assessments.some((assessment) => assessment.id === query.assessmentId) ? query.assessmentId : assessments[0]?.id ?? "";
    return <ScoreCaptureWorkspace schoolId={schoolId} assessments={assessments} initialAssessmentId={selectedId} />;
  } catch (error) {
    if (error instanceof ModuleDisabledError) redirect(`/app/schools/${schoolId}/settings/modules`);
    if (error instanceof AuthorizationError) redirect(`/app/schools/${schoolId}`);
    throw error;
  }
}
