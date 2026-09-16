CREATE TABLE "ResultAccessEntitlement" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "academicSessionId" UUID NOT NULL,
  "academicTermId" UUID NOT NULL,
  "transactionId" UUID NOT NULL,
  "grantedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResultAccessEntitlement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ResultAccessEntitlement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ResultAccessEntitlement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ResultAccessEntitlement_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ResultAccessEntitlement_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ResultAccessEntitlement_transactionId_key"
  ON "ResultAccessEntitlement"("transactionId");
CREATE UNIQUE INDEX "ResultAccessEntitlement_schoolId_studentId_academicSessionId_academicTermId_key"
  ON "ResultAccessEntitlement"("schoolId", "studentId", "academicSessionId", "academicTermId");
CREATE INDEX "ResultAccessEntitlement_schoolId_studentId_idx"
  ON "ResultAccessEntitlement"("schoolId", "studentId");
CREATE INDEX "ResultAccessEntitlement_schoolId_academicSessionId_academicTermId_idx"
  ON "ResultAccessEntitlement"("schoolId", "academicSessionId", "academicTermId");
