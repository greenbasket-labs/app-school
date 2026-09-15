import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";
import { requireSchoolModule } from "@/domain/modules/guard";
import AuditWorkspace from "./workspace";

export default async function FinanceAuditPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  const membership = await db.membership.findFirst({ where: { userId: session.user.id, schoolId, status: "ACTIVE" }, select: { school: { select: { name: true } }, capabilities: { select: { capability: { select: { code: true } } } } } });
  if (!membership || !membership.capabilities.some(({ capability }) => capability.code === CAPABILITIES.VIEW_FINANCE)) redirect(`/app/schools/${schoolId}`);
  try { await requireSchoolModule(schoolId, "FINANCE"); } catch { redirect(`/app/schools/${schoolId}/settings/modules`); }
  return <main style={{ minHeight: "100vh", padding: 24 }}><div style={{ maxWidth: 1000, margin: "0 auto" }}><Link href={`/app/schools/${schoolId}/finance`}>← Finance</Link><h1>{membership.school.name} — Finance history</h1><p>See meaningful finance changes recorded by the system.</p><AuditWorkspace schoolId={schoolId} /></div></main>;
}
