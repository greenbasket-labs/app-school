import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";

export class AuthenticationRequiredError extends Error {}
export class SchoolContextRequiredError extends Error {}

export async function requireSchoolContext(schoolId: string) {
  const session = await currentSession();
  if (!session) throw new AuthenticationRequiredError("Authentication required.");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, schoolId, status: "ACTIVE" },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      schoolId: true,
      school: { select: { id: true, name: true, status: true, setupStatus: true } },
    },
  });

  if (!membership) throw new SchoolContextRequiredError("Active membership for this school is required.");
  return { session, membership };
}
