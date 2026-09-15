CREATE TABLE "PaymentRecord" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "amount" DECIMAL(12, 2) NOT NULL,
    "paidAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "note" TEXT,
    "recordedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentRecord_schoolId_studentId_idx" ON "PaymentRecord"("schoolId", "studentId");
CREATE INDEX "PaymentRecord_schoolId_invoiceId_idx" ON "PaymentRecord"("schoolId", "invoiceId");
CREATE INDEX "PaymentRecord_schoolId_paidAt_idx" ON "PaymentRecord"("schoolId", "paidAt");

ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_invoiceId_fkey"
FOREIGN KEY ("invoiceId") REFERENCES "StudentFeeInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_recordedByUserId_fkey"
FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
