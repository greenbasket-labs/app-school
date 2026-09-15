import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { getAssessmentScoreRoster } from "@/domain/assessments/score-service";
import { db } from "@/lib/db";
import ScoreCaptureWorkspace from "./workspace";

export default async function AssessmentScorePage({ params }: { params: Promise<{ schoolId: string; assessmentId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId, assessmentId } = await params;
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: { capabilities: { select: { capability: { select: { code: true } } } } },
  });
  if (!membership) redirect("/app");
  const capabilities = new Set(membership.capabilities.map(({ capability }) => capability.code));
  if (!capabilities.has(CAPABILITIES.SUBMIT_RESULTS)) redirect(`/app/schools/${schoolId}`);
  try {
    await requireSchoolModule(schoolId, "ASSESSMENTS");
  } catch {
    redirect(`/app/schools/${schoolId}/settings`);
  }

  let data;
  try {
    data = await getAssessmentScoreRoster(schoolId, assessmentId);
  } catch {
    redirect(`/app/schools/${schoolId}/assessments`);
  }

  return (
    <main style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 950, margin: "0 auto" }}>
        <Link href={`/app/schools/${schoolId}/assessments`} style={{ color: "#53615a" }}>← Assessments</Link>
        <div style={{ marginTop: 20 }}>
          <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>Score capture</p>
          <h1 style={{ margin: "8px 0 6px", fontSize: 32 }}>{data.assessment.name}</h1>
          <p style={{ margin: 0, color: "#53615a" }}>{data.assessment.academicSession.name} · {data.assessment.academicTerm.name} · {data.assessment.classArm.classLevel.name} {data.assessment.classArm.name} · {data.assessment.subject.name} · Maximum {data.assessment.maxScore}</p>
        </div>
        <ScoreCaptureWorkspace schoolId={schoolId} assessmentId={assessmentId} initialData={data} />
      </div>
    </main>
  );
}
