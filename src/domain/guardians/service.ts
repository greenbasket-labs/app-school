import { db } from "@/lib/db";

export type GuardianInput = {
  schoolId: string;
  fullName: string;
  phone?: string;
  email?: string;
};

export async function listGuardians(schoolId: string) {
  return db.guardian.findMany({
    where: { schoolId },
    include: {
      studentGuardians: {
        include: {
          student: {
            select: { id: true, admissionNumber: true, firstName: true, middleName: true, lastName: true },
          },
        },
      },
    },
    orderBy: { fullName: "asc" },
  });
}

export async function createGuardian(input: GuardianInput) {
  return db.guardian.create({
    data: {
      schoolId: input.schoolId,
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
    },
  });
}

export async function linkGuardianToStudent(input: {
  schoolId: string;
  guardianId: string;
  studentId: string;
  relationship?: string;
  isPrimary?: boolean;
}) {
  const [guardian, student] = await Promise.all([
    db.guardian.findFirst({ where: { id: input.guardianId, schoolId: input.schoolId } }),
    db.student.findFirst({ where: { id: input.studentId, schoolId: input.schoolId } }),
  ]);
  if (!guardian || !student) throw new Error("Guardian and student must belong to the same school.");

  return db.studentGuardian.upsert({
    where: { studentId_guardianId: { studentId: input.studentId, guardianId: input.guardianId } },
    create: {
      schoolId: input.schoolId,
      studentId: input.studentId,
      guardianId: input.guardianId,
      relationship: input.relationship?.trim() || null,
      isPrimary: input.isPrimary ?? false,
    },
    update: {
      relationship: input.relationship?.trim() || null,
      isPrimary: input.isPrimary ?? false,
    },
  });
}

export async function unlinkGuardianFromStudent(input: {
  schoolId: string;
  guardianId: string;
  studentId: string;
}) {
  const link = await db.studentGuardian.findFirst({
    where: { schoolId: input.schoolId, guardianId: input.guardianId, studentId: input.studentId },
  });
  if (!link) throw new Error("Guardian relationship not found.");
  return db.studentGuardian.delete({
    where: { studentId_guardianId: { studentId: input.studentId, guardianId: input.guardianId } },
  });
}
