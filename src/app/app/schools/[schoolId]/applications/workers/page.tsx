import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/domain/auth/session-cookie";
import { listSchoolJoinRequests } from "@/domain/school-join/service";
import { SchoolJoinRequestStatus } from "@prisma/client";
import { db } from "@/lib/db";
import WorkerRequestReview from "./review-request";

export default async function WorkerApplicationsPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const session = await currentSession();

  if (!session) redirect("/login");

  const { schoolId } = await params;

  const membership = await db.membership.findFirst({
    where: {
      userId: session.user.id,
      schoolId,
      status: "ACTIVE",
    },
    select: {
      isOwner: true,
      school: { select: { name: true } },
    },
  });

  if (!membership?.isOwner) {
    redirect(`/app/schools/${schoolId}/dashboard`);
  }

  const requests = await listSchoolJoinRequests({
    schoolId,
    actorUserId: session.user.id,
    status: SchoolJoinRequestStatus.PENDING,
  });

  return (
    <main style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Link
          href={`/app/schools/${schoolId}/applications`}
          style={{ color: "#53615a", textDecoration: "none" }}
        >
          ← Applications
        </Link>

        <h1 style={{ margin: "18px 0 6px", fontSize: 34 }}>
          Job / Worker Requests
        </h1>

        <p style={{ margin: 0, color: "#53615a", lineHeight: 1.6 }}>
          Review people who have requested to join {membership.school.name} as
          staff, teachers or other school workers.
        </p>

        <section
          style={{
            marginTop: 24,
            padding: 20,
            border: "1px solid #dfe5e1",
            borderRadius: 14,
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, color: "#6b756f", marginBottom: 4 }}>
                Pending requests
              </div>
              <div style={{ fontSize: 30, fontWeight: 700 }}>{requests.length}</div>
            </div>
            <div style={{ color: "#53615a", fontSize: 14 }}>Owner review required</div>
          </div>
        </section>

        <section style={{ marginTop: 24 }}>
          {requests.length === 0 ? (
            <div
              style={{
                padding: 24,
                border: "1px solid #dfe5e1",
                borderRadius: 14,
                background: "#fff",
                color: "#53615a",
              }}
            >
              No pending worker requests.
              <div style={{ marginTop: 8, fontSize: 14 }}>
                New teacher and staff applications will appear here when people
                request to join this school.
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {requests.map((request) => (
                <article
                  key={request.id}
                  style={{
                    padding: 20,
                    border: "1px solid #dfe5e1",
                    borderRadius: 14,
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 20 }}>{request.user.email}</h2>
                      <div style={{ marginTop: 8, color: "#53615a", fontSize: 14 }}>
                        Requested relationship: <strong>{request.requestedRelationship}</strong>
                      </div>
                      <div style={{ marginTop: 6, color: "#53615a", fontSize: 14 }}>
                        Requested capabilities:{" "}
                        {request.requestedCapabilities?.length
                          ? request.requestedCapabilities.join(", ")
                          : "None specified"}
                      </div>
                      {request.message ? (
                        <div style={{ marginTop: 12, padding: 12, background: "#f6f8f7", borderRadius: 10, color: "#3f4944", fontSize: 14, lineHeight: 1.5 }}>
                          <strong>Message:</strong> {request.message}
                        </div>
                      ) : null}
                      <div style={{ marginTop: 12, color: "#7a847e", fontSize: 13 }}>
                        Submitted {new Date(request.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <span
                      style={{
                        display: "inline-block",
                        padding: "5px 10px",
                        borderRadius: 999,
                        background: "#fff7df",
                        color: "#775b00",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {request.status}
                    </span>
                  </div>

                  <WorkerRequestReview
                    schoolId={schoolId}
                    requestId={request.id}
                    requestedRelationship={request.requestedRelationship}
                    requestedCapabilities={request.requestedCapabilities ?? []}
                  />
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
