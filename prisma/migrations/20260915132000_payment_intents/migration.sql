-- Online payment intent boundary for provider-backed school invoice payments.
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
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentIntent_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "PaymentIntent_status_check" CHECK ("status" IN ('INITIALIZED', 'SUCCESS', 'FAILED')),
  CONSTRAINT "PaymentIntent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PaymentIntent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "StudentFeeInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PaymentIntent_reference_key" ON "PaymentIntent"("reference");
CREATE INDEX "PaymentIntent_schoolId_invoiceId_status_idx" ON "PaymentIntent"("schoolId", "invoiceId", "status");
CREATE INDEX "PaymentIntent_schoolId_createdAt_idx" ON "PaymentIntent"("schoolId", "createdAt");
