ALTER TABLE "PaymentRecord" ADD COLUMN "receiptNumber" TEXT;

CREATE UNIQUE INDEX "PaymentRecord_schoolId_receiptNumber_key"
ON "PaymentRecord"("schoolId", "receiptNumber");

CREATE INDEX "PaymentRecord_schoolId_receiptNumber_idx"
ON "PaymentRecord"("schoolId", "receiptNumber");
