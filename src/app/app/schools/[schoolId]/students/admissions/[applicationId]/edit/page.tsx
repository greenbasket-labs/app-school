import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";
import EditAdmissionForm from "./form";

export default async function EditAdmissionPage({
  params,
}: {
  params: Promise<{ schoolId: string; applicationId: string }>;
}) {
  const session = await currentSession();
  if (!session) redirect("/login");

  const { schoolId, applicationId } = await params;

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: {
      school: { select: { id: true, name: true } },
      capabilities: {
        select: { capability: { select: { code: true } } },
      },
    },
  });

  if (!membership) redirect("/app");

  const canManage = membership.capabilities.some(
    ({ capability }) => capability.code === CAPABILITIES.MANAGE_STUDENTS,
  );

  if (!canManage) redirect(`/app/schools/${schoolId}/students`);

  const [application, sessions, classLevels, classArms] = await Promise.all([
    db.admissionApplication.findFirst({
      where: { id: applicationId, schoolId },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        dateOfBirth: true,
        status: true,
        academicSessionId: true,
        classLevelId: true,
        classArmId: true,
      },
    }),
    db.academicSession.findMany({
      where: { schoolId },
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

  if (!application) {
    redirect(`/app/schools/${schoolId}/students`);
  }

  if (
    application.status === "APPROVED" ||
    application.status === "REJECTED" ||
    application.status === "WITHDRAWN"
  ) {
    redirect(
      `/app/schools/${schoolId}/students/admissions/${applicationId}`,
    );
  }

  return (
    <main style={{ minHeight: "100vh", padding: 32 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link
          href={`/app/schools/${schoolId}/students/admissions/${applicationId}`}
          style={{ color: "#53615a", textDecoration: "none", fontWeight: 700 }}
        >
          ← Review application
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
            Edit admission
          </p>
          <h1 style={{ margin: "8px 0 6px", fontSize: 32, color: "#173d2a" }}>
            Correct application
          </h1>
          <p style={{ margin: 0, color: "#53615a" }}>
            Update the application before approval.
          </p>
        </div>

        <EditAdmissionForm
          schoolId={schoolId}
          applicationId={applicationId}
          initial={application}
          sessions={sessions}
          classLevels={classLevels}
          classArms={classArms}
        />
      </div>
    </main>
  );
}
