import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type AssessmentScoreInput = {
  schoolId: string;
  assessmentId: string;
  studentId: string;
  score: number;
};

export class AssessmentScoreValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssessmentScoreValidationError";
  }
}

export class AssessmentScoreConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssessmentScoreConflictError";
  }
}

async function ensureAssessmentEditable(schoolId: string, assessmentId: string) {
  const submitted = await db.auditEvent.findFirst({
    where: { schoolId, entityType: "AssessmentDefinition", entityId: assessmentId, action: "assessment.result_submitted" },
    select: { id: true },
  });
  if (submitted) throw new AssessmentScoreValidationError("This assessment result has been submitted and can no longer be edited.");
}

export async function saveAssessmentScore(input: AssessmentScoreInput) {
  if (!Number.isFinite(input.score) || input.score < 0) {
    throw new AssessmentScoreValidationError("Score must be a finite number greater than or equal to 0.");
  }

  const assessment = await db.assessmentDefinition.findFirst({
    where: { id: input.assessmentId, schoolId: input.schoolId },
    select: {
      id: true,
      schoolId: true,
      academicSessionId: true,
      academicTermId: true,
      classArmId: true,
      subjectId: true,
      maxScore: true,
      name: true,
    },
  });
  if (!assessment) throw new AssessmentScoreValidationError("Assessment does not belong to this school.");
  await ensureAssessmentEditable(input.schoolId, assessment.id);

  const maxScore = assessment.maxScore.toNumber();
  if (input.score > maxScore) {
    throw new AssessmentScoreValidationError(`Score cannot be greater than the assessment maximum of ${maxScore}.`);
  }

  const enrollment = await db.enrollment.findFirst({
    where: {
      studentId: input.studentId,
      academicSessionId: assessment.academicSessionId,
      classArmId: assessment.classArmId,
      status: "ACTIVE",
      student: { schoolId: input.schoolId },
    },
    select: { id: true, studentId: true },
  });
  if (!enrollment) {
    throw new AssessmentScoreValidationError("Student is not actively enrolled in the selected class for this academic session.");
  }

  try {
    return await db.assessmentScore.upsert({
      where: { assessmentId_studentId: { assessmentId: assessment.id, studentId: enrollment.studentId } },
      create: {
        schoolId: input.schoolId,
        academicSessionId: assessment.academicSessionId,
        assessmentId: assessment.id,
        classArmId: assessment.classArmId,
        subjectId: assessment.subjectId,
        studentId: enrollment.studentId,
        enrollmentId: enrollment.id,
        score: new Prisma.Decimal(input.score),
      },
      update: {
        academicSessionId: assessment.academicSessionId,
        classArmId: assessment.classArmId,
        subjectId: assessment.subjectId,
        enrollmentId: enrollment.id,
        score: new Prisma.Decimal(input.score),
      },
      include: {
        student: { select: { id: true, admissionNumber: true, firstName: true, middleName: true, lastName: true } },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AssessmentScoreConflictError("A score already exists for this student and assessment.");
    }
    throw error;
  }
}

export async function getAssessmentScoreRoster(schoolId: string, assessmentId: string) {
  const assessment = await db.assessmentDefinition.findFirst({
    where: { id: assessmentId, schoolId },
    select: {
      id: true,
      academicSessionId: true,
      maxScore: true,
      name: true,
      academicSession: { select: { id: true, name: true } },
      academicTerm: { select: { id: true, name: true, order: true } },
      classArm: { select: { id: true, name: true, classLevel: { select: { name: true } } } },
      subject: { select: { id: true, name: true, code: true } },
    },
  });
  if (!assessment) throw new AssessmentScoreValidationError("Assessment does not belong to this school.");

  const students = await db.enrollment.findMany({
    where: { academicSessionId: assessment.academicSessionId, classArmId: assessment.classArm.id, status: "ACTIVE", student: { schoolId } },
    select: {
      id: true,
      student: {
        select: {
          id: true,
          admissionNumber: true,
          firstName: true,
          middleName: true,
          lastName: true,
          assessmentScores: { where: { assessmentId: assessment.id }, select: { id: true, score: true, updatedAt: true } },
        },
      },
    },
    orderBy: { student: { lastName: "asc" } },
  });

  return {
    assessment: { ...assessment, maxScore: assessment.maxScore.toNumber() },
    students: students.map(({ student, id: enrollmentId }) => ({
      enrollmentId,
      studentId: student.id,
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      middleName: student.middleName,
      lastName: student.lastName,
      score: student.assessmentScores[0]?.score.toNumber() ?? null,
      scoreId: student.assessmentScores[0]?.id ?? null,
      updatedAt: student.assessmentScores[0]?.updatedAt ?? null,
    })),
  };
}
