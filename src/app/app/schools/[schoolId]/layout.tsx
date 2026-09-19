import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";

export default async function SchoolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
          id: true,
          name: true,
        },
      },
    },
  });

  if (!membership) {
    redirect("/app");
  }

  const navigation = [
    {
      label: "Dashboard",
      href: `/app/schools/${schoolId}/dashboard`,
    },
    {
      label: "Students",
      href: `/app/schools/${schoolId}/students`,
    },
    {
      label: "Classes",
      href: `/app/schools/${schoolId}/academics`,
    },
    {
      label: "Attendance",
      href: `/app/schools/${schoolId}/attendance`,
    },
    {
      label: "Fees & Payments",
      href: `/app/schools/${schoolId}/fees-payments`,
    },
    {
      label: "Results",
      href: `/app/schools/${schoolId}/results`,
    },
    {
      label: "Reports",
      href: `/app/schools/${schoolId}/reports`,
    },
    {
      label: "Announcements",
      href: `/app/schools/${schoolId}/announcements`,
    },
    {
      label: "Staff & Teachers",
      href: `/app/schools/${schoolId}/staff`,
    },
    {
      label: "Parents",
      href: `/app/schools/${schoolId}/parents`,
    },
    {
      label: "Subjects & Setup",
      href: `/app/schools/${schoolId}/setup`,
    },
    {
      label: "School Settings",
      href: `/app/schools/${schoolId}/settings`,
    },
    {
      label: "Applications",
      href: `/app/schools/${schoolId}/applications`,
    },
    {
      label: "Users & Roles",
      href: `/app/schools/${schoolId}/users`,
    },
    {
      label: "Audit History",
      href: `/app/schools/${schoolId}/audit`,
    },
  ];

  const roleLabel = membership.isOwner
    ? "Owner / Admin"
    : membership.relationship === "ADMIN"
      ? "Admin"
      : membership.relationship === "TEACHER"
        ? "Teacher"
        : membership.relationship === "PARENT"
          ? "Parent"
          : membership.relationship === "STUDENT"
            ? "Student"
            : "Staff";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#f6f8f7",
      }}
    >
      <aside
        style={{
          width: 250,
          minHeight: "100vh",
          background: "#173d2a",
          color: "white",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        <div style={{ padding: "0 10px" }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            {membership.school.name}
          </div>

          <div
            style={{
              marginTop: 5,
              fontSize: 12,
              opacity: 0.7,
              textTransform: "uppercase",
              letterSpacing: ".08em",
            }}
          >
            {roleLabel}
          </div>
        </div>

        <nav
          style={{
            marginTop: 28,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "block",
                padding: "10px 12px",
                borderRadius: 9,
                color: "white",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div
          style={{
            marginTop: "auto",
            paddingTop: 24,
          }}
        >
          <Link
            href="/app"
            style={{
              display: "block",
              padding: "11px 12px",
              borderTop: "1px solid rgba(255,255,255,.15)",
              color: "white",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ← Account
          </Link>
        </div>
      </aside>

      <section
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        {children}
      </section>
    </div>
  );
}