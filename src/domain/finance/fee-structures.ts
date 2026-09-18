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
    db.academicSession.findFirst({ where: { id: input.academicSessionId, schoolId: input.schoolId }, select: { id: true } }),
    db.academicTerm.findFirst({ where: { id: input.academicTermId, academicSessionId: input.academicSessionId }, select: { id: true } }),
  ]);
  if (!session) throw new FeeStructureValidationError("Academic session does not belong to this school.");
  if (!term) throw new FeeStructureValidationError("Academic term must belong to the selected academic session.");
}

type FeeStructureRecord = {
  id: string;
  schoolId: string;
  academicSessionId: string;
  academicTermId: string;
  name: string;
  amount: Prisma.Decimal;
  description: string | null;
  dueDate: Date | null;
  isActive: boolean;
  academicSession: { id: string; name: string };
  academicTerm: { id: string; name: string; order: number };
};

function serializeFeeStructure(record: FeeStructureRecord) {
  return {
    id: record.id,
    schoolId: record.schoolId,
    academicSessionId: record.academicSessionId,
    academicTermId: record.academicTermId,
    sessionName: record.academicSession.name,
    termName: record.academicTerm.name,
    name: record.name,
    amount: record.amount.toNumber(),
    description: record.description,
    dueDate: record.dueDate ? record.dueDate.toISOString().slice(0, 10) : null,
    isActive: record.isActive,
  };
}

export async function listFeeStructures(schoolId: string) {
  const records = await db.feeStructure.findMany({
    where: { schoolId },
    include: {
      academicSession: { select: { id: true, name: true } },
      academicTerm: { select: { id: true, name: true, order: true } },
    },
    orderBy: [{ academicSession: { startsAt: "desc" } }, { academicTerm: { order: "asc" } }, { name: "asc" }],
  });

  return records.map(serializeFeeStructure);
}

export async function getFeeStructureOptions(schoolId: string) {
  return db.academicSession.findMany({
    where: { schoolId },
    select: { id: true, name: true, status: true, terms: { select: { id: true, name: true, order: true }, orderBy: { order: "asc" } } },
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

  await validateContext(input);

  try {
    return await db.$transaction(async (tx) => {
      const fee = await tx.feeStructure.create({
        data: {
          schoolId: input.schoolId,
          academicSessionId: input.academicSessionId,
          academicTermId: input.academicTermId,
          name,
          amount: new Prisma.Decimal(input.amount),
          description,
          dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null,
          isActive: true,
        },
        include: {
          academicSession: { select: { id: true, name: true } },
          academicTerm: { select: { id: true, name: true, order: true } },
        },
      });

      await tx.auditEvent.create({
        data: {
          schoolId: input.schoolId,
          actorUserId,
          action: "finance.fee_structure_created",
          entityType: "FeeStructure",
          entityId: fee.id,
          currentState: {
            name,
            amount: input.amount,
            academicSessionId: input.academicSessionId,
            academicTermId: input.academicTermId,
            isActive: true,
          },
        },
      });

      return serializeFeeStructure(fee);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new FeeStructureConflictError("A fee with this name already exists for this term.");
    }
    throw error;
  }
}
