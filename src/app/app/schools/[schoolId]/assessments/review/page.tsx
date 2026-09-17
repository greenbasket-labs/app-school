import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";
import ResultReviewWorkspace from "./workspace";

export default async function AssessmentReviewPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: { school: { select: { id: true, name: true } }, capabilities: { select: { capability: { select: { code: true } } } } },
  });
  if (!membership) redirect("/app");
  const capabilities = new Set(membership.capabilities.map(({ capability }) => capability.code));
  if (!capabilities.has(CAPABILITIES.APPROVE_RESULTS)) redirect(`/app/schools/${schoolId}`);
  try {
    await requireSchoolModule(schoolId, "ASSESSMENTS");
  } catch {
    redirect(`/app/schools/${schoolId}/settings`);
  }

  const assessments = await db.assessmentDefinition.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      maxScore: true,
      classArm: { select: { name: true, classLevel: { select: { name: true } } } },
      subject: { select: { name: true } },
      academicSession: { select: { name: true } },
      academicTerm: { select: { name: true } },
    },
    take: 50,
  });

  const auditEvents = assessments.length
    ? await db.auditEvent.findMany({
        where: {
          schoolId,
          entityType: "AssessmentDefinition",
          entityId: { in: assessments.map((item) => item.id) },
          action: { in: ["assessment.result_submitted", "assessment.result_approved", "assessment.result_published"] },
        },
        orderBy: { occurredAt: "desc" },
        select: { entityId: true, action: true, actorUserId: true, occurredAt: true },
      })
    : [];

  return (
    <main style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Link href={`/app/schools/${schoolId}/assessments`} style={{ color: "#53615a" }}>← Assessments</Link>
        <div style={{ marginTop: 20 }}>
          <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>Result review</p>
          <h1 style={{ margin: "8px 0 6px", fontSize: 34 }}>{membership.school.name}</h1>
          <p style={{ margin: 0, color: "#53615a" }}>Review submitted results and publish only after approval.</p>
        </div>
        <ResultReviewWorkspace schoolId={schoolId} assessments={assessments} auditEvents={auditEvents} />
      </div>
    </main>
  );
}
