import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";
import ApproveAdmissionForm from "./form";

export default async function ApproveAdmissionPage({
  params,
}: {
  params: Promise<{
    schoolId: string;
    applicationId: string;
  }>;
}) {
  const session = await currentSession();

  if (!session) {
    redirect("/login");
  }

  const { schoolId, applicationId } = await params;

  const membership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
      schoolId,
      status: "ACTIVE",
    },
    select: {
      school: {
        select: {
          id: true,
          name: true,
        },
      },
      capabilities: {
        select: {
          capability: {
            select: {
              code: true,
            },
          },
        },
      },
    },
  });

  if (!membership) {
    redirect("/app");
  }

  const capabilities = new Set(
    membership.capabilities.map(({ capability }) => capability.code),
  );

  if (!capabilities.has(CAPABILITIES.MANAGE_STUDENTS)) {
    redirect(`/app/schools/${schoolId}/students`);
  }

  const application = await db.admissionApplication.findFirst({
    where: {
      id: applicationId,
      schoolId,
    },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      status: true,
      academicSession: {
        select: {
          name: true,
        },
      },
      classLevel: {
        select: {
          name: true,
        },
      },
      classArm: {
        select: {
          name: true,
        },
      },
      student: {
        select: {
          admissionNumber: true,
        },
      },
    },
  });

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

  const applicantName = [
    application.firstName,
    application.middleName,
    application.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const requestedClass = application.classArm
    ? `${application.classLevel.name} — ${application.classArm.name}`
    : application.classLevel.name;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 32,
      }}
    >
      <div
        style={{
          maxWidth: 620,
          margin: "0 auto",
        }}
      >
        <Link
          href={`/app/schools/${schoolId}/students/admissions/${applicationId}`}
          style={{
            color: "#53615a",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 700,
          }}
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
            Approve admission
          </p>

          <h1
            style={{
              margin: "8px 0 6px",
              fontSize: 32,
              color: "#173d2a",
            }}
          >
            {applicantName}
          </h1>

          <p
            style={{
              margin: 0,
              color: "#53615a",
            }}
          >
            {membership.school.name}
          </p>
        </div>

        <section
          style={{
            marginTop: 24,
            background: "white",
            border: "1px solid #e0e6e2",
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            <Info label="Academic session" value={application.academicSession.name} />

            <Info label="Class" value={requestedClass} />
          </div>

          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: "1px solid #edf1ee",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 19,
                color: "#173d2a",
              }}
            >
              Admission number
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                fontSize: 14,
                lineHeight: 1.5,
                color: "#53615a",
              }}
            >
              Enter the admission number this school wants to assign to the
              student. Approval will create the official student record and
              enroll the student in the requested class.
            </p>

            <ApproveAdmissionForm
              schoolId={schoolId}
              applicationId={applicationId}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#6b7770",
          textTransform: "uppercase",
          letterSpacing: ".04em",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 5,
          color: "#173d2a",
          fontWeight: 600,
        }}
      >
        {value}
      </div>
    </div>
  );
}