import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";

export default async function ReportsPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  const membership = await db.membership.findFirst({ where: { userId: session.user.id, schoolId, status: "ACTIVE" }, select: { school: { select: { name: true } }, capabilities: { select: { capability: { select: { code: true } } } } } });
  if (!membership) redirect("/app");
  if (!new Set(membership.capabilities.map(({ capability }) => capability.code)).has(CAPABILITIES.VIEW_ATTENDANCE)) redirect(`/app/schools/${schoolId}`);
  try { await requireSchoolModule(schoolId, "REPORTS"); } catch { redirect(`/app/schools/${schoolId}/settings/modules`); }

  return <main style={{ minHeight: "100vh", padding: 24 }}><div style={{ maxWidth: 900, margin: "0 auto" }}><Link href={`/app/schools/${schoolId}`} style={{ color: "#53615a" }}>← School workspace</Link><p style={{ marginTop: 24, marginBottom: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>Reports</p><h1 style={{ margin: "8px 0" }}>{membership.school.name}</h1><p style={{ color: "#53615a" }}>Turn recorded school data into simple operational answers.</p><Link href={`/app/schools/${schoolId}/reports/attendance`} style={{ display: "block", marginTop: 24, padding: 20, border: "1px solid #dce3df", borderRadius: 14, textDecoration: "none", color: "inherit" }}><strong>Attendance report →</strong><p style={{ margin: "6px 0 0", color: "#53615a" }}>Review present, absent, late and excused records by period and student.</p></Link></div></main>;
}
