import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";
import AdmissionApplyForm from "./form";

export default async function AdmissionApplyPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const session = await currentSession();

  if (!session) {
    redirect("/login");
  }

  const { schoolId } = await params;

  const school = await db.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true },
  });

  if (!school) {
    redirect("/app");
  }

  const membership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
      schoolId,
      status: "ACTIVE",
    },
    select: {
      isOwner: true,
      capabilities: {
        select: {
          capability: {
            select: { code: true },
          },
        },
      },
    },
  });

  const canManage = Boolean(
    membership?.isOwner ||
      membership?.capabilities.some(
        ({ capability }) =>
          capability.code === CAPABILITIES.MANAGE_STUDENTS,
      ),
  );

  const [sessions, classLevels, classArms] = await Promise.all([
    db.academicSession.findMany({
      where: { schoolId, status: "ACTIVE" },
      select: { id: true, name: true },
    orderBy: { startsAt: "desc" },
    }),
    db.classLevel.findMany({
      where: { schoolId },
      select: { id: true, name: true, order: true },
      orderBy: { order: "asc" },
    }),
    db.classArm.findMany({
      where: { classLevel: { schoolId } },
      select: {
        id: true,
        name: true,
        classLevelId: true,
        classLevel: { select: { name: true } },
      },
      orderBy: [
        { classLevel: { order: "asc" } },
        { name: "asc" },
      ],
    }),
  ]);

  return (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link
          href="/app"
          style={{
            color: "#53615a",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          ← My SkulGo account
        </Link>

        <div style={{ marginTop: 24 }}>
          <p
            style={{
              margin: 0,
              fontWeight: 700,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              fontSize: 13,
              color: "#53615a",
            }}
          >
            Student admission
          </p>
          <h1
            style={{
              margin: "8px 0 6px",
              fontSize: 32,
              color: "#173d2a",
            }}
          >
            Apply to {school.name}
          </h1>
          <p style={{ margin: 0, color: "#53615a", lineHeight: 1.6 }}>
            Submit an admission request for a student. The school will review
            it before creating the official student record.
          </p>
        </div>

        <AdmissionApplyForm
          schoolId={schoolId}
          canManage={canManage}
          sessions={sessions}
          classLevels={classLevels}
          classArms={classArms}
        />
      </div>
    </main>
  );
}
