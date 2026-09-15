CREATE TABLE "SchoolPaymentProvider" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "settlementAccountReference" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolPaymentProvider_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchoolPaymentProvider_provider_check" CHECK ("provider" IN ('PAYSTACK', 'FLUTTERWAVE', 'MONNIFY')),
  CONSTRAINT "SchoolPaymentProvider_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SchoolPaymentProvider_schoolId_provider_key" ON "SchoolPaymentProvider"("schoolId", "provider");
CREATE INDEX "SchoolPaymentProvider_schoolId_enabled_idx" ON "SchoolPaymentProvider"("schoolId", "enabled");
