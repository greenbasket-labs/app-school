import { db } from "@/lib/db";

export type GuardianInput = {
  schoolId: string;
  fullName: string;
  phone?: string;
  email?: string;
  relationship?: string;
};

export async function listGuardians(schoolId: string) {
  return db.guardian.findMany({
    where: { schoolId },
    include: { studentGuardians: { include: { student: { select: { id: true, admissionNumber: true, firstName: true, middleName: true, lastName: true } } } } },
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
