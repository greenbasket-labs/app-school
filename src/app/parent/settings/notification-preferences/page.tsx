import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";
import { getGuardianNotificationPreference } from "@/domain/communication/guardian-notifications";
import { ParentNotificationPreferences } from "./workspace";

export default async function ParentNotificationPreferencesPage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  const guardians = await db.guardian.findMany({
    where: { userId: session.user.id, accountVerifiedAt: { not: null } },
    select: { schoolId: true, school: { select: { id: true, name: true } } },
    orderBy: { schoolId: "asc" },
  });
  if (!guardians.length) redirect("/parent");
  const schoolId = guardians[0].schoolId;
  const preference = await getGuardianNotificationPreference(schoolId, session.user.id);
  return <main style={{ minHeight: "100vh", padding: 24 }}><div style={{ maxWidth: 760, margin: "0 auto" }}><Link href="/parent">← Parent</Link><h1>Notification settings</h1><p style={{ color: "#53615a" }}>{guardians[0].school.name}</p><ParentNotificationPreferences schoolId={schoolId} initial={preference}/></div></main>;
}
