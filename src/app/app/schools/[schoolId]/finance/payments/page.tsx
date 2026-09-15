import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";
import PaymentWorkspace from "./workspace";

export default async function PaymentsPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: { school: { select: { id: true, name: true } }, capabilities: { select: { capability: { select: { code: true } } } } },
  });
  if (!membership) redirect("/app");
  if (!new Set(membership.capabilities.map(({ capability }) => capability.code)).has(CAPABILITIES.MANAGE_FINANCE)) redirect(`/app/schools/${schoolId}`);
  try { await requireSchoolModule(schoolId, "FINANCE"); } catch { redirect(`/app/schools/${schoolId}/settings/modules`); }

  return (
    <main style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Link href={`/app/schools/${schoolId}/finance`} style={{ color: "#53615a" }}>← Fees & Finance</Link>
        <h1 style={{ margin: "20px 0 6px", fontSize: 34 }}>{membership.school.name}</h1>
        <p style={{ margin: 0, color: "#53615a" }}>Record money received against an existing student invoice.</p>
        <PaymentWorkspace schoolId={schoolId} />
      </div>
    </main>
  );
}
