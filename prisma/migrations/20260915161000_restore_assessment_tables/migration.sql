CREATE TABLE "AssessmentDefinition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "academicSessionId" UUID NOT NULL,
  "academicTermId" UUID NOT NULL,
  "classArmId" UUID NOT NULL,
  "subjectId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "maxScore" DECIMAL(10, 2) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentDefinition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AssessmentDefinition_schoolId_academicTermId_classArmId_subjectId_name_key" ON "AssessmentDefinition"("schoolId", "academicTermId", "classArmId", "subjectId", "name");
CREATE INDEX "AssessmentDefinition_schoolId_academicSessionId_academicTermId_idx" ON "AssessmentDefinition"("schoolId", "academicSessionId", "academicTermId");
CREATE INDEX "AssessmentDefinition_schoolId_classArmId_subjectId_idx" ON "AssessmentDefinition"("schoolId", "classArmId", "subjectId");
ALTER TABLE "AssessmentDefinition" ADD CONSTRAINT "AssessmentDefinition_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentDefinition" ADD CONSTRAINT "AssessmentDefinition_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentDefinition" ADD CONSTRAINT "AssessmentDefinition_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentDefinition" ADD CONSTRAINT "AssessmentDefinition_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentDefinition" ADD CONSTRAINT "AssessmentDefinition_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AssessmentScore" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "academicSessionId" UUID NOT NULL,
  "assessmentId" UUID NOT NULL,
  "classArmId" UUID NOT NULL,
  "subjectId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "enrollmentId" UUID NOT NULL,
  "score" DECIMAL(10, 2) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentScore_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AssessmentScore_assessmentId_studentId_key" ON "AssessmentScore"("assessmentId", "studentId");
CREATE INDEX "AssessmentScore_schoolId_academicSessionId_classArmId_subjectId_idx" ON "AssessmentScore"("schoolId", "academicSessionId", "classArmId", "subjectId");
CREATE INDEX "AssessmentScore_schoolId_studentId_idx" ON "AssessmentScore"("schoolId", "studentId");
ALTER TABLE "AssessmentScore" ADD CONSTRAINT "AssessmentScore_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "AssessmentDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentScore" ADD CONSTRAINT "AssessmentScore_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentScore" ADD CONSTRAINT "AssessmentScore_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentScore" ADD CONSTRAINT "AssessmentScore_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentScore" ADD CONSTRAINT "AssessmentScore_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentScore" ADD CONSTRAINT "AssessmentScore_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentScore" ADD CONSTRAINT "AssessmentScore_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
