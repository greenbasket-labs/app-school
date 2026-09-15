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
