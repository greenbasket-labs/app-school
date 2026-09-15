import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";
import FeeStructureWorkspace from "./workspace";
import InvoiceWorkspace from "./invoices/workspace";

export default async function FinancePage({ params }: { params: Promise<{ schoolId: string }> }) {
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
  if (!capabilities.has(CAPABILITIES.MANAGE_FINANCE)) redirect(`/app/schools/${schoolId}`);

  try {
    await requireSchoolModule(schoolId, "FINANCE");
  } catch {
    redirect(`/app/schools/${schoolId}/settings/modules`);
  }

  return (
    <main style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Link href={`/app/schools/${schoolId}`} style={{ color: "#53615a" }}>← School workspace</Link>
        <div style={{ marginTop: 20 }}>
          <p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>Fees & Finance</p>
          <h1 style={{ margin: "8px 0 6px", fontSize: 34 }}>{membership.school.name}</h1>
          <p style={{ margin: 0, color: "#53615a" }}>Define charges, assign them to students, then create the actual obligation. Payments come later.</p>
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/app/schools/${schoolId}/finance/student-fee-assignments`} style={{ padding: "10px 14px", borderRadius: 10, background: "#183c2a", color: "white", textDecoration: "none", fontWeight: 700 }}>Student fee assignments →</Link>
        </div>
        <FeeStructureWorkspace schoolId={schoolId} />
        <InvoiceWorkspace schoolId={schoolId} />
      </div>
    </main>
  );
}
