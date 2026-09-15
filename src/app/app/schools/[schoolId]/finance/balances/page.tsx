import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/domain/auth/session-cookie";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { db } from "@/lib/db";
import { requireSchoolModule } from "@/domain/modules/guard";
import BalanceWorkspace from "./workspace";

export default async function FinanceBalancesPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: { school: { select: { id: true, name: true } }, capabilities: { select: { capability: { select: { code: true } } } } },
  });
  if (!membership) redirect("/app");
  if (!new Set(membership.capabilities.map(({ capability }) => capability.code)).has(CAPABILITIES.VIEW_FINANCE)) redirect(`/app/schools/${schoolId}`);
  try { await requireSchoolModule(schoolId, "FINANCE"); } catch { redirect(`/app/schools/${schoolId}/settings/modules`); }
  return <main style={{ minHeight: "100vh", padding: 24 }}><div style={{ maxWidth: 1100, margin: "0 auto" }}><Link href={`/app/schools/${schoolId}/finance`}>← Finance</Link><h1>{membership.school.name} — Balances</h1><p>See what has been charged, what has been received, and what remains outstanding.</p><BalanceWorkspace schoolId={schoolId} /></div></main>;
}
