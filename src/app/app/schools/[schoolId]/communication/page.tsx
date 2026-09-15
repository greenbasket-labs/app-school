import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/domain/auth/session-cookie";
import { requireSchoolModule } from "@/domain/modules/guard";
import { db } from "@/lib/db";
import { listGuardiansForAccess } from "@/domain/communication/parent-access";
import CommunicationWorkspace from "./workspace";

export default async function CommunicationPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  try { await requireSchoolModule(schoolId, "COMMUNICATION"); } catch { redirect(`/app/schools/${schoolId}/settings/modules`); }
  const membership = await db.membership.findFirst({ where: { userId: session.user.id, schoolId, status: "ACTIVE" }, select: { id: true, isOwner: true, school: { select: { name: true } }, capabilities: { select: { capability: { select: { code: true } } } } } });
  if (!membership) redirect("/app");
  const recipients = await db.membership.findMany({ where: { schoolId, status: "ACTIVE" }, select: { id: true, isOwner: true, user: { select: { email: true } } }, orderBy: { createdAt: "asc" } });
  const canSend = membership.capabilities.some(({ capability }) => capability.code === "COMMUNICATION.SEND");
  const guardians = membership.isOwner ? await listGuardiansForAccess(schoolId) : [];
  return <main style={{ minHeight: "100vh", padding: 24 }}><div style={{ maxWidth: 1000, margin: "0 auto" }}><Link href={`/app/schools/${schoolId}`} style={{ color: "#53615a" }}>← School workspace</Link><div style={{ marginTop: 20 }}><p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>Communication</p><h1 style={{ margin: "8px 0 6px", fontSize: 34 }}>{membership.school.name}</h1><p style={{ margin: 0, color: "#53615a" }}>Send selected people an in-app notice. External channels remain available for later delivery integrations.</p></div><CommunicationWorkspace schoolId={schoolId} membershipId={membership.id} recipients={recipients} guardians={guardians} isOwner={membership.isOwner} canSend={canSend} /></div></main>;
}
