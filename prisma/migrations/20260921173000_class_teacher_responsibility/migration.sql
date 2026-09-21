CREATE TYPE "ClassTeacherResponsibilityStatus" AS ENUM ('ACTIVE', 'ENDED');

CREATE TABLE "ClassTeacherResponsibility" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "membershipId" UUID NOT NULL,
  "academicSessionId" UUID NOT NULL,
  "academicTermId" UUID NOT NULL,
  "classArmId" UUID NOT NULL,
  "status" "ClassTeacherResponsibilityStatus" NOT NULL DEFAULT 'ACTIVE',
  "endedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "ClassTeacherResponsibility_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClassTeacherResponsibility_schoolId_membershipId_status_idx"
  ON "ClassTeacherResponsibility"("schoolId", "membershipId", "status");

CREATE INDEX "ClassTeacherResponsibility_schoolId_academicSessionId_academicTermId_classArmId_status_idx"
  ON "ClassTeacherResponsibility"("schoolId", "academicSessionId", "academicTermId", "classArmId", "status");

CREATE INDEX "ClassTeacherResponsibility_membershipId_academicSessionId_academicTermId_status_idx"
  ON "ClassTeacherResponsibility"("membershipId", "academicSessionId", "academicTermId", "status");

ALTER TABLE "ClassTeacherResponsibility"
  ADD CONSTRAINT "ClassTeacherResponsibility_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClassTeacherResponsibility"
  ADD CONSTRAINT "ClassTeacherResponsibility_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClassTeacherResponsibility"
  ADD CONSTRAINT "ClassTeacherResponsibility_academicSessionId_fkey"
  FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClassTeacherResponsibility"
  ADD CONSTRAINT "ClassTeacherResponsibility_academicTermId_fkey"
  FOREIGN KEY ("academicTermId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClassTeacherResponsibility"
  ADD CONSTRAINT "ClassTeacherResponsibility_classArmId_fkey"
  FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
