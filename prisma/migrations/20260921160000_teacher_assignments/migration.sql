CREATE TYPE "TeacherAssignmentStatus" AS ENUM ('ACTIVE', 'ENDED');

CREATE TABLE "TeacherAssignment" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "membershipId" UUID NOT NULL,
  "academicSessionId" UUID NOT NULL,
  "academicTermId" UUID NOT NULL,
  "classArmId" UUID NOT NULL,
  "subjectId" UUID NOT NULL,
  "status" "TeacherAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "endedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TeacherAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT,
  CONSTRAINT "TeacherAssignment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT,
  CONSTRAINT "TeacherAssignment_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT,
  CONSTRAINT "TeacherAssignment_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT,
  CONSTRAINT "TeacherAssignment_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE RESTRICT,
  CONSTRAINT "TeacherAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT
);

CREATE INDEX "TeacherAssignment_schoolId_membershipId_status_idx" ON "TeacherAssignment"("schoolId", "membershipId", "status");
CREATE INDEX "TeacherAssignment_schoolId_academicSessionId_academicTermId_classArmId_subjectId_idx" ON "TeacherAssignment"("schoolId", "academicSessionId", "academicTermId", "classArmId", "subjectId");
CREATE INDEX "TeacherAssignment_membershipId_academicSessionId_academicTermId_idx" ON "TeacherAssignment"("membershipId", "academicSessionId", "academicTermId");