import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type AssessmentDefinitionInput = {
  schoolId: string;
  academicSessionId: string;
  academicTermId: string;
  classArmId: string;
  subjectId: string;
  name: string;
  maxScore: number;
};

export class AssessmentDefinitionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssessmentDefinitionConflictError";
  }
}

export class AssessmentDefinitionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssessmentDefinitionValidationError";
  }
}

async function validateDefinitionInput(input: AssessmentDefinitionInput) {
  const [session, term, classArm, subject, classSubject] = await Promise.all([
    db.academicSession.findFirst({ where: { id: input.academicSessionId, schoolId: input.schoolId }, select: { id: true } }),
    db.academicTerm.findFirst({ where: { id: input.academicTermId, academicSessionId: input.academicSessionId }, select: { id: true, academicSessionId: true } }),
    db.classArm.findFirst({ where: { id: input.classArmId, classLevel: { schoolId: input.schoolId } }, select: { id: true } }),
    db.subject.findFirst({ where: { id: input.subjectId, schoolId: input.schoolId }, select: { id: true } }),
    db.classSubject.findFirst({ where: { academicSessionId: input.academicSessionId, classArmId: input.classArmId, subjectId: input.subjectId }, select: { id: true } }),
  ]);

  if (!session) throw new AssessmentDefinitionValidationError("Academic session does not belong to this school.");
  if (!term) throw new AssessmentDefinitionValidationError("Academic term must belong to the selected academic session.");
  if (!classArm) throw new AssessmentDefinitionValidationError("Class arm does not belong to this school.");
  if (!subject) throw new AssessmentDefinitionValidationError("Subject does not belong to this school.");
  if (!classSubject) throw new AssessmentDefinitionValidationError("The selected subject is not assigned to the selected class for this academic session.");
}

export async function createAssessmentDefinition(input: AssessmentDefinitionInput) {
  const name = input.name.trim();
  if (!name) throw new AssessmentDefinitionValidationError("Assessment name is required.");
  if (!Number.isFinite(input.maxScore) || input.maxScore <= 0 || input.maxScore > 10000) {
    throw new AssessmentDefinitionValidationError("Maximum score must be greater than 0 and no more than 10,000.");
  }

  await validateDefinitionInput({ ...input, name });

  try {
    return await db.assessmentDefinition.create({
      data: {
        schoolId: input.schoolId,
        academicSessionId: input.academicSessionId,
        academicTermId: input.academicTermId,
        classArmId: input.classArmId,
        subjectId: input.subjectId,
        name,
        maxScore: new Prisma.Decimal(input.maxScore),
      },
      include: {
        academicSession: { select: { id: true, name: true } },
        academicTerm: { select: { id: true, name: true, order: true } },
        classArm: { select: { id: true, name: true, classLevel: { select: { name: true } } } },
        subject: { select: { id: true, name: true, code: true } },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AssessmentDefinitionConflictError("An assessment with this name already exists for this class, subject and term.");
    }
    throw error;
  }
}

export async function listAssessmentDefinitions(schoolId: string) {
  const records = await db.assessmentDefinition.findMany({
    where: { schoolId },
    include: {
      academicSession: { select: { id: true, name: true } },
      academicTerm: { select: { id: true, name: true, order: true } },
      classArm: { select: { id: true, name: true, classLevel: { select: { name: true } } } },
      subject: { select: { id: true, name: true, code: true } },
    },
    orderBy: [{ academicSession: { startsAt: "desc" } }, { academicTerm: { order: "asc" } }, { classArm: { name: "asc" } }, { subject: { name: "asc" } }, { name: "asc" }],
  });

  return records.map((record) => ({ ...record, maxScore: record.maxScore.toNumber() }));
}

export async function getAssessmentDefinitionOptions(schoolId: string) {
  const [sessions, classArms, subjects] = await Promise.all([
    db.academicSession.findMany({
      where: { schoolId },
      select: { id: true, name: true, status: true, terms: { select: { id: true, name: true, order: true }, orderBy: { order: "asc" } } },
      orderBy: { startsAt: "desc" },
    }),
    db.classArm.findMany({
      where: { classLevel: { schoolId } },
      select: { id: true, name: true, classLevel: { select: { id: true, name: true, order: true } } },
      orderBy: [{ classLevel: { order: "asc" } }, { name: "asc" }],
    }),
    db.subject.findMany({ where: { schoolId }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
  ]);

  return { sessions, classArms, subjects };
}
