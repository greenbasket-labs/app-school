import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";
import ModuleSettings from "./modules";
import SessionSettings from "./sessions";
import StaffSettings from "./staff";
import SchoolProfileSettings from "./profile";
import PaymentProviderSettings from "./payment-providers";
import TeacherAssignmentsSettings from "./teacher-assignments";

export default async function SchoolSettingsPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { schoolId } = await params;
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: { school: { select: { name: true } }, isOwner: true },
  });
  if (!membership) redirect("/app");

  return (
    <main style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <Link href={`/app/schools/${schoolId}`} style={{ color: "#53615a" }}>← School workspace</Link>
        <h1 style={{ margin: "18px 0 6px", fontSize: 34 }}>{membership.school.name} settings</h1>
        <p style={{ color: "#53615a", lineHeight: 1.6 }}>Settings is the control surface for school configuration, access and module updates.</p>
        <SchoolProfileSettings schoolId={schoolId} canManage={membership.isOwner} />
        <SessionSettings schoolId={schoolId} canManage={membership.isOwner} />
        <StaffSettings schoolId={schoolId} canManage={membership.isOwner} />
        <TeacherAssignmentsSettings schoolId={schoolId} canManage={membership.isOwner} />
        <PaymentProviderSettings schoolId={schoolId} canManage={membership.isOwner} />
        <ModuleSettings schoolId={schoolId} canManage={membership.isOwner} />
      </div>
    </main>
  );
}
