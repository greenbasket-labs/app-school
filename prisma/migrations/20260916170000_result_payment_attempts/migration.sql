CREATE TABLE "ResultPaymentAttempt" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "academicSessionId" UUID NOT NULL,
  "academicTermId" UUID NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "provider" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "providerReference" TEXT,
  "checkoutUrl" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResultPaymentAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ResultPaymentAttempt_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ResultPaymentAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ResultPaymentAttempt_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ResultPaymentAttempt_academicTermId_fkey" FOREIGN KEY ("academicTermId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ResultPaymentAttempt_currency_check" CHECK ("currency" = 'NGN'),
  CONSTRAINT "ResultPaymentAttempt_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "ResultPaymentAttempt_status_check" CHECK ("status" IN ('PENDING','INITIALIZED','FAILED','SUCCEEDED')),
  CONSTRAINT "ResultPaymentAttempt_provider_check" CHECK ("provider" IN ('PAYSTACK','FLUTTERWAVE','MONNIFY'))
);

CREATE UNIQUE INDEX "ResultPaymentAttempt_schoolId_idempotencyKey_key"
  ON "ResultPaymentAttempt"("schoolId", "idempotencyKey");
CREATE INDEX "ResultPaymentAttempt_schoolId_createdAt_idx"
  ON "ResultPaymentAttempt"("schoolId", "createdAt");
CREATE INDEX "ResultPaymentAttempt_schoolId_studentId_idx"
  ON "ResultPaymentAttempt"("schoolId", "studentId");
CREATE INDEX "ResultPaymentAttempt_provider_status_idx"
  ON "ResultPaymentAttempt"("provider", "status");
