import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export class AcademicSessionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AcademicSessionConflictError";
  }
}

export type CreateAcademicSessionInput = {
  schoolId: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
};

export async function createAcademicSession(input: CreateAcademicSessionInput) {
  if (input.endsAt <= input.startsAt) {
    throw new Error("Academic session end date must be after its start date.");
  }

  try {
    return await db.academicSession.create({
      data: {
        schoolId: input.schoolId,
        name: input.name.trim(),
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      },
      include: { terms: { orderBy: { order: "asc" } } },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AcademicSessionConflictError("An academic session with this name already exists for this school.");
    }
    throw error;
  }
}

export async function getAcademicSessions(schoolId: string) {
  return db.academicSession.findMany({
    where: { schoolId },
    include: { terms: { orderBy: { order: "asc" } } },
    orderBy: { startsAt: "desc" },
  });
}
