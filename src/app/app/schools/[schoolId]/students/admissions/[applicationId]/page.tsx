import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";
import AdmissionStatusActions from "./status-actions";

export default async function AdmissionReviewPage({
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

  if (!capabilities.has(CAPABILITIES.VIEW_STUDENTS)) {
    redirect(`/app/schools/${schoolId}`);
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
      dateOfBirth: true,
      status: true,
      submittedAt: true,
      rejectionReason: true,
      academicSession: {
        select: {
          id: true,
          name: true,
        },
      },
      classLevel: {
        select: {
          id: true,
          name: true,
        },
      },
      classArm: {
        select: {
          id: true,
          name: true,
        },
      },
      applicant: {
        select: {
          id: true,
          email: true,
        },
      },
      student: {
        select: {
          id: true,
          admissionNumber: true,
        },
      },
    },
  });

  if (!application) {
    redirect(`/app/schools/${schoolId}/students`);
  }

  const applicantName = [
    application.firstName,
    application.middleName,
    application.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const submittedDate = new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(application.submittedAt);

  const dateOfBirth = application.dateOfBirth
    ? new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(application.dateOfBirth)
    : "Not provided";

  const requestedClass = application.classArm
    ? `${application.classLevel.name} — ${application.classArm.name}`
    : application.classLevel.name;

  const canManage = capabilities.has(CAPABILITIES.MANAGE_STUDENTS);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 32,
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        <Link
          href={`/app/schools/${schoolId}/students`}
          style={{
            color: "#53615a",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          ← Students
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
            Admission Request
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
              paddingBottom: 20,
              borderBottom: "1px solid #edf1ee",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  color: "#6b7770",
                }}
              >
                Application status
              </div>

              <strong
                style={{
                  display: "inline-block",
                  marginTop: 5,
                  color: "#173d2a",
                }}
              >
                {formatStatus(application.status)}
              </strong>
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#53615a",
              }}
            >
              Submitted {submittedDate}
            </div>
          </div>

          <div
            style={{
              marginTop: 22,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 18,
            }}
          >
            <Detail label="Applicant" value={applicantName} />

            <Detail
              label="Applicant account"
              value={application.applicant.email}
            />

            <Detail label="Date of birth" value={dateOfBirth} />

            <Detail
              label="Academic session"
              value={application.academicSession.name}
            />

            <Detail label="Requested class" value={requestedClass} />
          </div>

          {application.rejectionReason && (
            <div
              style={{
                marginTop: 22,
                padding: 14,
                borderRadius: 10,
                background: "#fff7ed",
                border: "1px solid #f2dfc5",
              }}
            >
              <strong
                style={{
                  display: "block",
                  color: "#7a4b13",
                  fontSize: 13,
                }}
              >
                Rejection reason
              </strong>

              <div
                style={{
                  marginTop: 5,
                  color: "#6b5132",
                  fontSize: 14,
                }}
              >
                {application.rejectionReason}
              </div>
            </div>
          )}

          {application.student && (
            <div
              style={{
                marginTop: 22,
                padding: 14,
                borderRadius: 10,
                background: "#f3f7f4",
                border: "1px solid #dce8df",
              }}
            >
              <strong
                style={{
                  display: "block",
                  color: "#173d2a",
                  fontSize: 13,
                }}
              >
                Student created
              </strong>

              <div
                style={{
                  marginTop: 5,
                  color: "#53615a",
                  fontSize: 14,
                }}
              >
                Admission number:{" "}
                <strong>{application.student.admissionNumber}</strong>
              </div>
            </div>
          )}

          {canManage &&
            application.status !== "APPROVED" &&
            application.status !== "REJECTED" &&
            application.status !== "WITHDRAWN" && (
              <div
                style={{
                  marginTop: 28,
                  paddingTop: 20,
                  borderTop: "1px solid #edf1ee",
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <Link
                  href={`/app/schools/${schoolId}/students/admissions/${applicationId}/edit`}
                  style={secondaryButton}
                >
                  Edit application
                </Link>

                <Link
                  href={`/app/schools/${schoolId}/students/admissions/${applicationId}/approve`}
                  style={primaryButton}
                >
                  Approve
                </Link>

                <AdmissionStatusActions
                  schoolId={schoolId}
                  applicationId={applicationId}
                  status={application.status}
                />
              </div>
            )}
        </section>
      </div>
    </main>
  );
}

function Detail({
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

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const secondaryButton = {
  display: "inline-block",
  padding: "10px 15px",
  borderRadius: 9,
  border: "1px solid #ccd6d0",
  background: "white",
  color: "#173d2a",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 700,
};

const primaryButton = {
  display: "inline-block",
  padding: "10px 15px",
  borderRadius: 9,
  border: 0,
  background: "#173d2a",
  color: "white",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 700,
};