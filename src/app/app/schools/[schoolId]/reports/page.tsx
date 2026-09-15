import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { isSchoolModuleEnabled } from "@/domain/modules/service";
import { requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";

export default async function ReportsPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  const membership = await db.membership.findFirst({ where: { userId: session.user.id, schoolId, status: "ACTIVE" }, select: { school: { select: { name: true } }, capabilities: { select: { capability: { select: { code: true } } } } } });
  if (!membership) redirect("/app");
  try { await requireSchoolModule(schoolId, "REPORTS"); } catch { redirect(`/app/schools/${schoolId}/settings/modules`); }
  const capabilitySet = new Set(membership.capabilities.map(({ capability }) => capability.code));
  const attendanceEnabled = capabilitySet.has(CAPABILITIES.VIEW_ATTENDANCE) && await isSchoolModuleEnabled(schoolId, "ATTENDANCE");
  const financeEnabled = capabilitySet.has(CAPABILITIES.VIEW_FINANCE) && await isSchoolModuleEnabled(schoolId, "FINANCE");

  return <main style={{ minHeight: "100vh", padding: 24 }}><div style={{ maxWidth: 900, margin: "0 auto" }}><Link href={`/app/schools/${schoolId}`} style={{ color: "#53615a" }}>← School workspace</Link><p style={{ marginTop: 24, marginBottom: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>Reports</p><h1 style={{ margin: "8px 0" }}>{membership.school.name}</h1><p style={{ color: "#53615a" }}>Turn recorded school data into simple operational answers.</p>{attendanceEnabled && <Link href={`/app/schools/${schoolId}/reports/attendance`} style={cardLink}><strong>Attendance report →</strong><p style={sub}>Review present, absent, late and excused records by period and student.</p></Link>}{financeEnabled && <Link href={`/app/schools/${schoolId}/reports/finance`} style={cardLink}><strong>Finance report →</strong><p style={sub}>See open invoices, payments recorded, money received and outstanding obligations.</p></Link>}{!attendanceEnabled && !financeEnabled && <p style={{ marginTop: 24, color: "#53615a" }}>No reports are available for your current access and enabled school modules.</p>}</div></main>;
}
const cardLink = { display: "block", marginTop: 18, padding: 20, border: "1px solid #dce3df", borderRadius: 14, textDecoration: "none", color: "inherit" };
const sub = { margin: "6px 0 0", color: "#53615a" };
