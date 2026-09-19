import Link from "next/link";
import { redirect } from "next/navigation";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import { getOperationalSummary } from "@/domain/reports/operational-summary";
import { db } from "@/lib/db";

export default async function DashboardPage({
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
      isOwner: true,
      relationship: true,
      school: {
        select: {
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

  const canManageSchool = membership.capabilities.some(
    ({ capability }) => capability.code === CAPABILITIES.MANAGE_SCHOOL,
  );

  const isOwnerAdmin =
    membership.isOwner || membership.relationship === "ADMIN";

  if (!isOwnerAdmin && !canManageSchool) {
    redirect(`/app/schools/${schoolId}`);
  }

  const summary = await getOperationalSummary(schoolId);

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(value);

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f8f7",
        padding: 32,
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
        }}
      >
        <Link
          href={`/app/schools/${schoolId}`}
          style={{
            color: "#53615a",
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          ← School workspace
        </Link>

        <div
          style={{
            marginTop: 28,
            display: "flex",
            justifyContent: "space-between",
            gap: 24,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "#53615a",
              }}
            >
              {membership.school.name}
            </p>

            <h1
              style={{
                margin: "8px 0 0",
                fontSize: 34,
                lineHeight: 1.15,
                color: "#173d2a",
              }}
            >
              Good morning, Owner / Admin
            </h1>

            <p
              style={{
                margin: "10px 0 0",
                color: "#53615a",
                maxWidth: 680,
              }}
            >
              Everything your school needs to monitor daily operations.
            </p>

            <p
              style={{
                margin: "10px 0 0",
                color: "#53615a",
                fontSize: 14,
              }}
            >
              {summary.activeSession?.name ?? "No active academic session"}
              {" · "}
              {summary.currentTerm?.name ?? "No current term"}
              {" · "}
              School management
            </p>
          </div>
        </div>

        <section
          style={{
            marginTop: 28,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 14,
          }}
        >
          <MetricCard
            label="Students"
            value={summary.activeStudents.toLocaleString("en-NG")}
            description="Active learners"
          />

          <MetricCard
            label="Teachers"
            value={summary.activeStaff.toLocaleString("en-NG")}
            description="Teaching staff"
          />

          <MetricCard
            label="Attendance"
            value={formatPercent(summary.attendanceRate)}
            description="Today"
          />

          <MetricCard
            label="Outstanding"
            value={formatMoney(summary.outstandingAmount)}
            description="Fees balance"
          />
        </section>

        <section
          style={{
            marginTop: 30,
            background: "white",
            border: "1px solid #e0e6e2",
            borderRadius: 18,
            padding: 24,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              color: "#173d2a",
            }}
          >
            Today at a glance
          </h2>

          <p
            style={{
              margin: "6px 0 0",
              color: "#53615a",
              fontSize: 14,
            }}
          >
            Current operational indicators from your school records.
          </p>

          <div
            style={{
              marginTop: 20,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 14,
            }}
          >
            <StatusCard
              label="Attendance recorded"
              value={formatPercent(summary.attendanceRate)}
              detail={`${summary.attendanceRecordedToday.toLocaleString(
                "en-NG",
              )} records today`}
            />

            <StatusCard
              label="Fee collection"
              value={formatPercent(summary.feeCollectionRate)}
              detail="This academic session"
            />

            <StatusCard
              label="Results processed"
              value={formatPercent(summary.resultsProcessed)}
              detail="This academic term"
            />
          </div>
        </section>

        <section
          style={{
            marginTop: 30,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              color: "#173d2a",
            }}
          >
            Quick actions
          </h2>

          <p
            style={{
              margin: "6px 0 0",
              color: "#53615a",
              fontSize: 14,
            }}
          >
            Jump straight into the areas used most.
          </p>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <QuickAction
              href={`/app/schools/${schoolId}/reports`}
              label="View reports"
            />

            <QuickAction
              href={`/app/schools/${schoolId}/students`}
              label="Students"
            />

            <QuickAction
              href={`/app/schools/${schoolId}/academics`}
              label="Classes"
            />

            <QuickAction
              href={`/app/schools/${schoolId}/attendance`}
              label="Attendance"
            />
          </div>
        </section>

        <p
          style={{
            marginTop: 28,
            color: "#6b7770",
            fontSize: 13,
          }}
        >
          This dashboard is read-only. It is derived from authoritative school
          records and does not create or change operational data.
        </p>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e0e6e2",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 14,
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
          lineHeight: 1.1,
          fontWeight: 700,
          color: "#173d2a",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 7,
          fontSize: 13,
          color: "#6b7770",
        }}
      >
        {description}
      </div>
    </div>
  );
}

function StatusCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e0e6e2",
        borderRadius: 14,
        padding: 18,
        background: "#fbfcfb",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#173d2a",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 26,
          fontWeight: 700,
          color: "#173d2a",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 13,
          color: "#6b7770",
        }}
      >
        {detail}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "16px 18px",
        borderRadius: 12,
        border: "1px solid #dce4df",
        background: "white",
        color: "#173d2a",
        textDecoration: "none",
        fontWeight: 700,
      }}
    >
      {label}
    </Link>
  );
}