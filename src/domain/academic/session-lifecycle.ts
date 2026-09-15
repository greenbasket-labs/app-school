import { AcademicSessionStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export class AcademicSessionLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AcademicSessionLifecycleError";
  }
}

export async function updateAcademicSessionStatus(input: {
  schoolId: string;
  sessionId: string;
  status: AcademicSessionStatus;
}) {
  const session = await db.academicSession.findFirst({
    where: { id: input.sessionId, schoolId: input.schoolId },
    include: { terms: { orderBy: { order: "asc" } } },
  });
  if (!session) throw new AcademicSessionLifecycleError("Academic session not found.");
  if (session.status === input.status) return session;

  if (session.status === "DRAFT" && input.status === "ACTIVE") {
    if (session.terms.length === 0) throw new AcademicSessionLifecycleError("Add at least one academic term before activating the session.");
    if (session.terms.some((term) => term.startsAt < session.startsAt || term.endsAt > session.endsAt || term.endsAt <= term.startsAt)) {
      throw new AcademicSessionLifecycleError("All academic terms must have valid dates inside the session.");
    }
    const active = await db.academicSession.findFirst({ where: { schoolId: input.schoolId, status: "ACTIVE", id: { not: input.sessionId } }, select: { id: true, name: true } });
    if (active) throw new AcademicSessionLifecycleError(`Another academic session is already active: ${active.name}.`);
  } else if (session.status === "ACTIVE" && input.status === "DRAFT") {
    throw new AcademicSessionLifecycleError("An active academic session cannot return to draft.");
  } else if (session.status === "CLOSED") {
    throw new AcademicSessionLifecycleError("A closed academic session cannot change status.");
  } else if (session.status === "DRAFT" && input.status === "CLOSED") {
    throw new AcademicSessionLifecycleError("A draft academic session must be activated before it can be closed.");
  }

  try {
    return await db.academicSession.update({
      where: { id: session.id },
      data: { status: input.status },
      include: { terms: { orderBy: { order: "asc" } } },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AcademicSessionLifecycleError("Another academic session is already active.");
    }
    throw error;
  }
}
