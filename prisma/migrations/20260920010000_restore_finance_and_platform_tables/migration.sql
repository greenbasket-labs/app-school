-- Restore domain tables that were accidentally removed by the admission-application migration.
-- This migration is intentionally additive: it recreates the tables from the original
-- finance, parent-access, payment-provider, and platform-foundation migrations.

CREATE TABLE "StudentFeeAssignment" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "feeStructureId" UUID NOT NULL,
    "amount" DECIMAL(12, 2) NOT NULL,
    "assignedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "StudentFeeAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentFeeAssignment_schoolId_studentId_feeStructureId_key"
ON "StudentFeeAssignment"("schoolId", "studentId", "feeStructureId");
CREATE INDEX "StudentFeeAssignment_schoolId_studentId_idx"
ON "StudentFeeAssignment"("schoolId", "studentId");
CREATE INDEX "StudentFeeAssignment_schoolId_feeStructureId_idx"
ON "StudentFeeAssignment"("schoolId", "feeStructureId");

ALTER TABLE "StudentFeeAssignment"
ADD CONSTRAINT "StudentFeeAssignment_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentFeeAssignment"
ADD CONSTRAINT "StudentFeeAssignment_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentFeeAssignment"
ADD CONSTRAINT "StudentFeeAssignment_feeStructureId_fkey"
FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "StudentFeeInvoice" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "studentFeeAssignmentId" UUID NOT NULL,
    "feeName" TEXT NOT NULL,
    "amount" DECIMAL(12, 2) NOT NULL,
    "dueDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "issuedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "StudentFeeInvoice_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StudentFeeInvoice_status_check" CHECK ("status" IN ('OPEN', 'CANCELLED'))
);

CREATE UNIQUE INDEX "StudentFeeInvoice_studentFeeAssignmentId_key"
ON "StudentFeeInvoice"("studentFeeAssignmentId");
CREATE INDEX "StudentFeeInvoice_schoolId_studentId_status_idx"
ON "StudentFeeInvoice"("schoolId", "studentId", "status");
CREATE INDEX "StudentFeeInvoice_schoolId_issuedAt_idx"
ON "StudentFeeInvoice"("schoolId", "issuedAt");

ALTER TABLE "StudentFeeInvoice"
ADD CONSTRAINT "StudentFeeInvoice_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentFeeInvoice"
ADD CONSTRAINT "StudentFeeInvoice_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentFeeInvoice"
ADD CONSTRAINT "StudentFeeInvoice_studentFeeAssignmentId_fkey"
FOREIGN KEY ("studentFeeAssignmentId") REFERENCES "StudentFeeAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PaymentRecord" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "amount" DECIMAL(12, 2) NOT NULL,
    "paidAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "note" TEXT,
    "recordedByUserId" UUID,
    "receiptNumber" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentRecord_schoolId_studentId_idx" ON "PaymentRecord"("schoolId", "studentId");
CREATE INDEX "PaymentRecord_schoolId_invoiceId_idx" ON "PaymentRecord"("schoolId", "invoiceId");
CREATE INDEX "PaymentRecord_schoolId_paidAt_idx" ON "PaymentRecord"("schoolId", "paidAt");
CREATE UNIQUE INDEX "PaymentRecord_schoolId_receiptNumber_key"
ON "PaymentRecord"("schoolId", "receiptNumber");
CREATE INDEX "PaymentRecord_schoolId_receiptNumber_idx"
ON "PaymentRecord"("schoolId", "receiptNumber");

ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_invoiceId_fkey"
FOREIGN KEY ("invoiceId") REFERENCES "StudentFeeInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_recordedByUserId_fkey"
FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PaymentIntent" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "invoiceId" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "status" TEXT NOT NULL DEFAULT 'INITIALIZED',
  "checkoutUrl" TEXT,
  "providerTransactionId" TEXT,
  "settlementAccountReference" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentIntent_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "PaymentIntent_status_check" CHECK ("status" IN ('INITIALIZED', 'SUCCESS', 'FAILED')),
  CONSTRAINT "PaymentIntent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PaymentIntent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "StudentFeeInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PaymentIntent_reference_key" ON "PaymentIntent"("reference");
CREATE INDEX "PaymentIntent_schoolId_invoiceId_status_idx"
ON "PaymentIntent"("schoolId", "invoiceId", "status");
CREATE INDEX "PaymentIntent_schoolId_createdAt_idx"
ON "PaymentIntent"("schoolId", "createdAt");

CREATE TABLE "SchoolPaymentProvider" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "settlementAccountReference" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolPaymentProvider_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchoolPaymentProvider_provider_check"
    CHECK ("provider" IN ('PAYSTACK', 'FLUTTERWAVE', 'MONNIFY')),
  CONSTRAINT "SchoolPaymentProvider_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SchoolPaymentProvider_schoolId_provider_key"
ON "SchoolPaymentProvider"("schoolId", "provider");
CREATE INDEX "SchoolPaymentProvider_schoolId_enabled_idx"
ON "SchoolPaymentProvider"("schoolId", "enabled");

CREATE TABLE "ParentAccessInvitation" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "guardianId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "usedAt" TIMESTAMPTZ(6),
  "createdByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "ParentAccessInvitation_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT,
  CONSTRAINT "ParentAccessInvitation_guardianId_fkey"
    FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE RESTRICT,
  CONSTRAINT "ParentAccessInvitation_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT
);

CREATE INDEX "ParentAccessInvitation_schoolId_createdAt_idx"
ON "ParentAccessInvitation"("schoolId", "createdAt");
CREATE INDEX "ParentAccessInvitation_guardianId_usedAt_idx"
ON "ParentAccessInvitation"("guardianId", "usedAt");

CREATE TABLE "RuleDefinition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "config" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "updatedByUserId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RuleDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RuleDefinition_schoolId_code_key"
ON "RuleDefinition"("schoolId", "code");
CREATE INDEX "RuleDefinition_schoolId_enabled_idx"
ON "RuleDefinition"("schoolId", "enabled");
ALTER TABLE "RuleDefinition"
ADD CONSTRAINT "RuleDefinition_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PlatformJob" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMPTZ(6),
  "lastError" TEXT,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformJob_schoolId_type_idempotencyKey_key"
ON "PlatformJob"("schoolId", "type", "idempotencyKey");
CREATE INDEX "PlatformJob_status_availableAt_idx"
ON "PlatformJob"("status", "availableAt");
CREATE INDEX "PlatformJob_schoolId_type_idx"
ON "PlatformJob"("schoolId", "type");
ALTER TABLE "PlatformJob"
ADD CONSTRAINT "PlatformJob_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "IdempotencyRecord" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "result" JSONB,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdempotencyRecord_schoolId_key_operation_key"
ON "IdempotencyRecord"("schoolId", "key", "operation");
CREATE INDEX "IdempotencyRecord_schoolId_createdAt_idx"
ON "IdempotencyRecord"("schoolId", "createdAt");
ALTER TABLE "IdempotencyRecord"
ADD CONSTRAINT "IdempotencyRecord_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
