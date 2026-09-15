CREATE TABLE "AssessmentScore" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicSessionId" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "classArmId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "score" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

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
