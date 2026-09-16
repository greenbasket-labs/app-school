CREATE TABLE "ResultPaymentProviderEvent" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "paymentAttemptId" UUID,
  "providerReference" TEXT,
  "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMPTZ(6),
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "error" TEXT,
  CONSTRAINT "ResultPaymentProviderEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ResultPaymentProviderEvent_provider_check" CHECK ("provider" IN ('PAYSTACK','FLUTTERWAVE','MONNIFY')),
  CONSTRAINT "ResultPaymentProviderEvent_status_check" CHECK ("status" IN ('RECEIVED','PROCESSED','FAILED')),
  CONSTRAINT "ResultPaymentProviderEvent_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "ResultPaymentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ResultPaymentProviderEvent_provider_eventKey_key"
  ON "ResultPaymentProviderEvent"("provider", "eventKey");
CREATE INDEX "ResultPaymentProviderEvent_paymentAttemptId_idx"
  ON "ResultPaymentProviderEvent"("paymentAttemptId");
CREATE INDEX "ResultPaymentProviderEvent_provider_status_idx"
  ON "ResultPaymentProviderEvent"("provider", "status");
