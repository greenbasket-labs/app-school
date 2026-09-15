import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type FeeStructureInput = {
  schoolId: string;
  academicSessionId: string;
  academicTermId: string;
  name: string;
  amount: number;
  description?: string;
  dueDate?: string;
};

export type FeeStructureRecord = {
  id: string;
  schoolId: string;
  academicSessionId: string;
  academicTermId: string;
  sessionName: string;
  termName: string;
  name: string;
  amount: number;
  description: string | null;
  dueDate: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class FeeStructureValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeeStructureValidationError";
  }
}

export class FeeStructureConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeeStructureConflictError";
  }
}

async function validateContext(input: FeeStructureInput) {
  const [session, term] = await Promise.all([
    db.academicSession.findFirst({
      where: { id: input.academicSessionId, schoolId: input.schoolId },
      select: { id: true },
    }),
    db.academicTerm.findFirst({
      where: { id: input.academicTermId, academicSessionId: input.academicSessionId },
      select: { id: true },
    }),
  ]);

  if (!session) throw new FeeStructureValidationError("Academic session does not belong to this school.");
  if (!term) throw new FeeStructureValidationError("Academic term must belong to the selected academic session.");
}

export async function listFeeStructures(schoolId: string): Promise<FeeStructureRecord[]> {
  const rows = await db.$queryRaw<Array<Omit<FeeStructureRecord, "amount"> & { amount: string }>>(Prisma.sql`
    SELECT
      f."id",
      f."schoolId",
      f."academicSessionId",
      f."academicTermId",
      s."name" AS "sessionName",
      t."name" AS "termName",
      f."name",
      f."amount"::text AS "amount",
      f."description",
      TO_CHAR(f."dueDate", 'YYYY-MM-DD') AS "dueDate",
      f."isActive",
      f."createdAt",
      f."updatedAt"
    FROM "FeeStructure" f
    INNER JOIN "AcademicSession" s ON s."id" = f."academicSessionId" AND s."schoolId" = f."schoolId"
    INNER JOIN "AcademicTerm" t ON t."id" = f."academicTermId" AND t."academicSessionId" = f."academicSessionId"
    WHERE f."schoolId" = ${schoolId}::uuid
    ORDER BY s."startsAt" DESC, t."order" ASC, f."name" ASC
  `);

  return rows.map((row) => ({ ...row, amount: Number(row.amount) }));
}

export async function getFeeStructureOptions(schoolId: string) {
  return db.academicSession.findMany({
    where: { schoolId },
    select: {
      id: true,
      name: true,
      status: true,
      terms: { select: { id: true, name: true, order: true }, orderBy: { order: "asc" } },
    },
    orderBy: { startsAt: "desc" },
  });
}

export async function createFeeStructure(input: FeeStructureInput, actorUserId: string) {
  const name = input.name.trim();
  const description = input.description?.trim() || null;

  if (!name) throw new FeeStructureValidationError("Fee name is required.");
  if (name.length > 120) throw new FeeStructureValidationError("Fee name must be 120 characters or fewer.");
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 100_000_000) {
    throw new FeeStructureValidationError("Fee amount must be greater than 0 and no more than 100,000,000.");
  }
  if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
    throw new FeeStructureValidationError("Due date must use YYYY-MM-DD format.");
  }

  await validateContext({ ...input, name, description: description ?? undefined });

  const id = crypto.randomUUID();

  try {
    return await db.$transaction(async (tx) => {
      const duplicate = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "FeeStructure"
        WHERE "schoolId" = ${input.schoolId}::uuid
          AND "academicTermId" = ${input.academicTermId}::uuid
          AND LOWER("name") = LOWER(${name})
        LIMIT 1
      `);
      if (duplicate.length) {
        throw new FeeStructureConflictError("A fee with this name already exists for this term.");
      }

      const rows = await tx.$queryRaw<Array<Omit<FeeStructureRecord, "amount"> & { amount: string }>>(Prisma.sql`
        INSERT INTO "FeeStructure" (
          "id", "schoolId", "academicSessionId", "academicTermId", "name", "amount", "description", "dueDate", "isActive", "createdAt", "updatedAt"
        ) VALUES (
          ${id}::uuid,
          ${input.schoolId}::uuid,
          ${input.academicSessionId}::uuid,
          ${input.academicTermId}::uuid,
          ${name},
          ${input.amount},
          ${description},
          ${input.dueDate ? input.dueDate : null}::date,
          true,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        RETURNING "id", "schoolId", "academicSessionId", "academicTermId", "name", "amount"::text AS "amount", "description", TO_CHAR("dueDate", 'YYYY-MM-DD') AS "dueDate", "isActive", "createdAt", "updatedAt"
      `);

      const created = rows[0];
      await tx.auditEvent.create({
        data: {
          schoolId: input.schoolId,
          actorUserId,
          action: "finance.fee_structure_created",
          entityType: "FeeStructure",
          entityId: id,
          previousState: null,
          currentState: {
            name,
            amount: input.amount,
            academicSessionId: input.academicSessionId,
            academicTermId: input.academicTermId,
            isActive: true,
          },
        },
      });

      return { ...created, amount: Number(created.amount) };
    });
  } catch (error) {
    if (error instanceof FeeStructureConflictError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new FeeStructureConflictError("A fee with this name already exists for this term.");
    }
    throw error;
  }
}
