CREATE TABLE "ResultAccessTransaction" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "academicSessionId" UUID NOT NULL,
  "academicTermId" UUID NOT NULL,
  "paymentAttemptId" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "providerReference" TEXT NOT NULL,
  "grossAmount" DECIMAL(12,2) NOT NULL,
  "providerFee" DECIMAL(12,2),
  "netAmount" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "planCode" TEXT NOT NULL,
  "planSchoolSharePercent" DECIMAL(5,2) NOT NULL,
  "planAppSchoolSharePercent" DECIMAL(5,2) NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResultAccessTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ResultAccessTransaction_paymentAttemptId_key" UNIQUE ("paymentAttemptId"),
  CONSTRAINT "ResultAccessTransaction_providerReference_key" UNIQUE ("provider", "providerReference"),
  CONSTRAINT "ResultAccessTransaction_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ResultAccessTransaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ResultAccessTransaction_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ResultAccessTransaction_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "AcademicTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ResultAccessTransaction_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "ResultPaymentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ResultAccessTransaction_schoolId_idx" ON "ResultAccessTransaction"("schoolId");
CREATE INDEX "ResultAccessTransaction_studentId_idx" ON "ResultAccessTransaction"("studentId");
CREATE INDEX "ResultAccessTransaction_verifiedAt_idx" ON "ResultAccessTransaction"("verifiedAt");

CREATE TABLE "ResultRevenueAllocation" (
  "id" UUID NOT NULL,
  "transactionId" UUID NOT NULL,
  "grossAmount" DECIMAL(12,2) NOT NULL,
  "schoolShare" DECIMAL(12,2) NOT NULL,
  "appSchoolShare" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResultRevenueAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ResultRevenueAllocation_transactionId_key" UNIQUE ("transactionId"),
  CONSTRAINT "ResultRevenueAllocation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "ResultAccessTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ResultRevenueAllocation_createdAt_idx" ON "ResultRevenueAllocation"("createdAt");

ALTER TABLE "ResultAccessEntitlement"
  ADD CONSTRAINT "ResultAccessEntitlement_transactionId_fkey"
  FOREIGN KEY ("transactionId") REFERENCES "ResultAccessTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
