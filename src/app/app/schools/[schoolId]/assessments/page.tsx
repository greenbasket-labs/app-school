import { Link } from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { getAssessmentDefinitionOptions, listAssessmentDefinitions } from "@/domain/assessments/service";
import { db } from "@/lib/db";
import AssessmentWorkspace from "./workspace";

export default async function AssessmentsPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: {
      school: { select: { id: true, name: true } },
      capabilities: { select: { capability: { select: { code: true } } } },
    },
  });
  if (!membership) redirect("/app");
  const capabilities = new Set(membership.capabilities.map(({ capability }) => capability.code));
  if (!capabilities.has(CAPABILITIES.CREATE_ASSESSMENT)) redirect(`/app/schools/${schoolId}`);

  try {
    await requireSchoolModule(schoolId, "ASSESSMENTS");
  } catch {
    redirect(`/app/schools/${schoolId}/settings`);
  }

  const [assessments, options] = await Promise.all([
    listAssessmentDefinitions(schoolId),
    getAssessmentDefinitionOptions(schoolId),
  ]);

  return (
    <main style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1150, margin: "0 auto" }}>
        <Link href={`/app/schools/${schoolId}`} style={{ color: "#53615a" }}>← School workspace</Link>
        <div style={{ marginTop: 20 }}>
          <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>Assessments</p>
          <h1 style={{ margin: "8px 0 6px", fontSize: 34 }}>{membership.school.name}</h1>
          <p style={{ margin: 0, color: "#53615a" }}>Define the assessment structure, capture scores, then submit and approve results.</p>
        </div>
        <AssessmentWorkspace schoolId={schoolId} initialAssessments={assessments} options={options} />
      </div>
    </main>
  );
}
