import { db } from "@/lib/db";

export class AuthorizationError extends Error {
  constructor(message = "You are not authorized to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireCapability(
  userId: string,
  schoolId: string,
  capabilityCode: string,
) {
  const membership = await db.membership.findFirst({
    where: { userId, schoolId, status: "ACTIVE" },
    include: { capabilities: { include: { capability: true } } },
  });

  if (!membership) throw new AuthorizationError("Active school membership required.");

  // The owner is the ultimate school authority. Ownership grants the
  // publication capability by default; staff must receive RESULT.PUBLISH
  // explicitly through the school's capability-assignment flow.
  const allowed =
    membership.isOwner && capabilityCode === "RESULT.PUBLISH"
      ? true
      : membership.capabilities.some(
          ({ capability }) => capability.code === capabilityCode,
        );

  if (!allowed) throw new AuthorizationError();
  return membership;
}
