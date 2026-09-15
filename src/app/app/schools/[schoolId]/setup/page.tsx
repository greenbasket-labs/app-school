import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";
import SetupWorkspace from "./workspace";

export default async function SchoolSetupPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: { school: { select: { id: true, name: true, setupStatus: true } }, capabilities: { select: { capability: { select: { code: true } } } } },
  });
  if (!membership || !membership.capabilities.some(({ capability }) => capability.code === CAPABILITIES.MANAGE_SCHOOL)) redirect(`/app/schools/${schoolId}`);

  return <SetupWorkspace schoolId={schoolId} schoolName={membership.school.name} setupStatus={membership.school.setupStatus} />;
}
