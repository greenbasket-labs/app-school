import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";
import StudentWorkspace from "./workspace";

export default async function StudentsPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const session = await currentSession();

  if (!session) {
    redirect("/login");
  }

  const { schoolId } = await params;

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

  const [students, sessions, classArms, admissionRequests] =
    await Promise.all([
      db.student.findMany({
        where: {
          schoolId,
        },
        select: {
          id: true,
          admissionNumber: true,
          firstName: true,
          middleName: true,
          lastName: true,
          status: true,
          enrollments: {
            select: {
              id: true,
              status: true,
              academicSession: {
                select: {
                  id: true,
                  name: true,
                },
              },
              classArm: {
                select: {
                  id: true,
                  name: true,
                  classLevel: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              enrolledAt: "desc",
            },
          },
        },
        orderBy: [
          {
            lastName: "asc",
          },
          {
            firstName: "asc",
          },
        ],
      }),

      db.academicSession.findMany({
        where: {
          schoolId,
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
        orderBy: {
          startsAt: "desc",
        },
      }),

      db.classArm.findMany({
        where: {
          classLevel: {
            schoolId,
          },
        },
        select: {
          id: true,
          name: true,
          classLevel: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [
          {
            classLevel: {
              order: "asc",
            },
          },
          {
            name: "asc",
          },
        ],
      }),

      db.admissionApplication.findMany({
        where: {
          schoolId,
          status: {
            in: ["PENDING", "UNDER_REVIEW"],
          },
        },
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          status: true,
          submittedAt: true,
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
        },
        orderBy: {
          submittedAt: "desc",
        },
      }),
    ]);

  const sessionOptions = sessions.map((item) => ({
    ...item,
    classArms,
  }));

  const totalStudents = students.length;

  const activeStudents = students.filter(
    (student) => student.status === "ACTIVE",
  ).length;

  const inactiveStudents = totalStudents - activeStudents;

  const pendingAdmissionCount = admissionRequests.filter(
    (application) => application.status === "PENDING",
  ).length;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 32,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div>
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
            Students
          </p>

          <h1
            style={{
              margin: "8px 0 6px",
              fontSize: 34,
              color: "#173d2a",
            }}
          >
            {membership.school.name}
          </h1>

          <p
            style={{
              margin: 0,
              color: "#53615a",
            }}
          >
            Manage students and admissions.
          </p>
        </div>

        <section
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 14,
          }}
        >
          <SummaryCard
            label="Total Students"
            value={totalStudents.toLocaleString("en-NG")}
          />

          <SummaryCard
            label="Active Students"
            value={activeStudents.toLocaleString("en-NG")}
          />

          <SummaryCard
            label="Inactive"
            value={inactiveStudents.toLocaleString("en-NG")}
          />
        </section>

        <section
          style={{
            marginTop: 24,
          }}
        >
          <details
            style={{
              border: "1px solid #e0e6e2",
              borderRadius: 14,
              background: "white",
              overflow: "hidden",
            }}
          >
            <summary
              style={{
                listStyle: "none",
                cursor: "pointer",
                padding: "18px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <strong
                  style={{
                    display: "block",
                    color: "#173d2a",
                  }}
                >
                  Admission Requests
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: 4,
                    fontSize: 13,
                    color: "#6b7770",
                  }}
                >
                  {pendingAdmissionCount === 0
                    ? "No pending applications."
                    : `${pendingAdmissionCount} pending application${
                        pendingAdmissionCount === 1 ? "" : "s"
                      }`}
                </span>
              </div>

              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#53615a",
                  whiteSpace: "nowrap",
                }}
              >
                {pendingAdmissionCount} pending
              </span>
            </summary>

            {admissionRequests.length > 0 && (
              <div
                style={{
                  borderTop: "1px solid #edf1ee",
                }}
              >
                {admissionRequests.map((application, index) => {
                  const applicantName = [
                    application.firstName,
                    application.middleName,
                    application.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  const submittedDate = new Intl.DateTimeFormat("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(application.submittedAt);

                  const className = application.classArm
                    ? `${application.classLevel.name} — ${application.classArm.name}`
                    : application.classLevel.name;

                  return (
                    <div
                      key={application.id}
                      style={{
                        padding: "16px 20px",
                        borderBottom:
                          index === admissionRequests.length - 1
                            ? undefined
                            : "1px solid #edf1ee",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <strong
                          style={{
                            color: "#173d2a",
                          }}
                        >
                          {applicantName}
                        </strong>

                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 13,
                            color: "#53615a",
                          }}
                        >
                          {className} · {submittedDate}
                        </div>

                        {application.status === "UNDER_REVIEW" && (
                          <div
                            style={{
                              marginTop: 5,
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#8a6414",
                            }}
                          >
                            Under review
                          </div>
                        )}
                      </div>

                      {capabilities.has(CAPABILITIES.MANAGE_STUDENTS) ? (
                        <Link
                          href={`/app/schools/${schoolId}/students/admissions/${application.id}`}
                          style={{
                            display: "inline-block",
                            padding: "9px 14px",
                            borderRadius: 9,
                            background: "#173d2a",
                            color: "white",
                            textDecoration: "none",
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          Review
                        </Link>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </details>
        </section>

        <section
          style={{
            marginTop: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  color: "#173d2a",
                }}
              >
                Students
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#6b7770",
                  fontSize: 13,
                }}
              >
                {totalStudents === 0
                  ? "No students have been registered yet."
                  : `${totalStudents.toLocaleString("en-NG")} student${
                      totalStudents === 1 ? "" : "s"
                    }`}
              </p>
            </div>

            {capabilities.has(CAPABILITIES.MANAGE_STUDENTS) && (
              <span
                style={{
                  fontSize: 13,
                  color: "#53615a",
                }}
              >
                Student registration is managed through admissions.
              </span>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <StudentWorkspace
              schoolId={schoolId}
              canManage={capabilities.has(CAPABILITIES.MANAGE_STUDENTS)}
              initialStudents={students}
              sessions={sessionOptions}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e0e6e2",
        borderRadius: 14,
        background: "white",
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#53615a",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 30,
          fontWeight: 700,
          color: "#173d2a",
        }}
      >
        {value}
      </div>
    </div>
  );
}