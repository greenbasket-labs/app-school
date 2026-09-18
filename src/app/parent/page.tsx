import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";
import { listVerifiedGuardianChildren } from "@/domain/guardians/account-access";
import { listParentNotifications } from "@/domain/communication/guardian-notifications";
import { ParentNotificationInbox } from "./notification-inbox";

export default async function ParentPage() {
  const session = await currentSession();
  if (!session) redirect("/login");

  const verifiedGuardians = await db.guardian.findMany({
    where: { userId: session.user.id, accountVerifiedAt: { not: null } },
    select: { schoolId: true, school: { select: { id: true, name: true } } },
    orderBy: { schoolId: "asc" },
  });

  if (verifiedGuardians.length === 0) {
    return <main style={{ minHeight: "100vh", padding: 32 }}><div style={{ maxWidth: 700, margin: "80px auto" }}><p style={{ fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>SkulGo</p><h1>Parent access is not verified yet</h1><p style={{ color: "#53615a" }}>Your personal account exists, but a school has not yet verified you as a guardian. Child academic data remains protected until that relationship is explicitly verified.</p><Link href="/app">Back to my account</Link></div></main>;
  }

  const schoolChildren = await Promise.all(verifiedGuardians.map(async ({ schoolId, school }) => ({
    school,
    children: await listVerifiedGuardianChildren(schoolId, session.user.id),
    notifications: (await listParentNotifications(schoolId, session.user.id)).map((notification) => ({
      ...notification,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt ? notification.readAt.toISOString() : null,
    })),
  })));

  return <main style={{ minHeight: "100vh", padding: 24 }}><div style={{ maxWidth: 900, margin: "0 auto" }}><Link href="/app" style={{ color: "#53615a" }}>← My account</Link><div style={{ marginTop: 20 }}><p style={{ margin: 0, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 13 }}>Parent</p><h1 style={{ margin: "8px 0 6px" }}>My children</h1><p style={{ color: "#53615a" }}>Only children connected through your verified guardian relationships are shown.</p></div>{schoolChildren.map(({ school, children, notifications }) => <section key={school.id} style={{ border: "1px solid #dfe7e2", borderRadius: 14, padding: 18, marginTop: 18 }}><h2>{school.name}</h2>{children.length === 0 ? <p>No linked children are available yet.</p> : <div>{children.map((child) => <div key={child.id} style={{ borderTop: "1px solid #edf1ee", padding: "12px 0" }}><strong>{child.firstName} {child.middleName ? `${child.middleName} ` : ""}{child.lastName}</strong><div style={{ color: "#53615a", fontSize: 14 }}>Admission: {child.admissionNumber}</div><Link href={`/parent/children/${child.id}?schoolId=${school.id}`} style={{ display: "inline-block", marginTop: 8 }}>View academic history</Link></div>)}</div>}{school.id === verifiedGuardians[0].schoolId && <ParentNotificationInbox schoolId={school.id} initialNotifications={notifications} />}</section>)}</div></main>;
}
