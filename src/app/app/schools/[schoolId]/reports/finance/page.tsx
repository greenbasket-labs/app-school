import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { getFinanceSummary } from "@/domain/reports/finance-summary";
import { db } from "@/lib/db";

export default async function FinanceReportPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  const membership = await db.membership.findFirst({ where: { userId: session.user.id, schoolId, status: "ACTIVE" }, select: { school: { select: { name: true } }, capabilities: { select: { capability: { select: { code: true } } } } } });
  if (!membership) redirect("/app");
  if (!new Set(membership.capabilities.map(({ capability }) => capability.code)).has(CAPABILITIES.VIEW_FINANCE)) redirect(`/app/schools/${schoolId}`);
  try { await requireSchoolModule(schoolId, "REPORTS"); await requireSchoolModule(schoolId, "FINANCE"); } catch { redirect(`/app/schools/${schoolId}/settings/modules`); }
  const report = await getFinanceSummary(schoolId);
  const money = (value: number) => `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

  return <main style={{ minHeight: "100vh", padding: 24 }}><div style={{ maxWidth: 1000, margin: "0 auto" }}><Link href={`/app/schools/${schoolId}/reports`} style={{ color: "#53615a" }}>← Reports</Link><p style={{ marginTop: 24, marginBottom: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>Finance report</p><h1 style={{ margin: "8px 0" }}>{membership.school.name}</h1><p style={{ color: "#53615a" }}>A simple view of current fee obligations and money recorded by the school.</p><section style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>{[["Open invoices", report.invoiceCount], ["Payments recorded", report.paymentCount], ["Amount invoiced", money(report.invoiced)], ["Amount paid", money(report.paid)], ["Outstanding", money(report.outstanding)]].map(([label, value]) => <div key={String(label)} style={{ padding: 18, border: "1px solid #dce3df", borderRadius: 14 }}><strong>{label}</strong><div style={{ marginTop: 8, fontSize: 25, fontWeight: 800 }}>{value}</div></div>)}</section><p style={{ marginTop: 20, color: "#53615a" }}>This report is derived from the school's recorded invoices and payments; it does not create or change financial records.</p></div></main>;
}
