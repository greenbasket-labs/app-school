-- Assessment definitions are school-scoped configuration records for later score capture.
CREATE TABLE "AssessmentDefinition" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicSessionId" UUID NOT NULL,
    "academicTermId" UUID NOT NULL,
    "classArmId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "maxScore" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "AssessmentDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssessmentDefinition_schoolId_academicTermId_classArmId_subjectId_name_key"
ON "AssessmentDefinition"("schoolId", "academicTermId", "classArmId", "subjectId", "name");

CREATE INDEX "AssessmentDefinition_schoolId_academicSessionId_academicTermId_idx"
ON "AssessmentDefinition"("schoolId", "academicSessionId", "academicTermId");

CREATE INDEX "AssessmentDefinition_schoolId_classArmId_subjectId_idx"
ON "AssessmentDefinition"("schoolId", "classArmId", "subjectId");

ALTER TABLE "AssessmentDefinition" ADD CONSTRAINT "AssessmentDefinition_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssessmentDefinition" ADD CONSTRAINT "AssessmentDefinition_academicSessionId_fkey"
FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssessmentDefinition" ADD CONSTRAINT "AssessmentDefinition_academicTermId_fkey"
FOREIGN KEY ("academicTermId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssessmentDefinition" ADD CONSTRAINT "AssessmentDefinition_classArmId_fkey"
FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssessmentDefinition" ADD CONSTRAINT "AssessmentDefinition_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
