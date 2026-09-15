CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "studentFeeAssignmentId" UUID NOT NULL,
    "amount" DECIMAL(12, 2) NOT NULL,
    "feeName" TEXT NOT NULL,
    "dueDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invoice_studentFeeAssignmentId_key"
ON "Invoice"("studentFeeAssignmentId");

CREATE INDEX "Invoice_schoolId_studentId_idx"
ON "Invoice"("schoolId", "studentId");

CREATE INDEX "Invoice_schoolId_status_idx"
ON "Invoice"("schoolId", "status");

ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_studentFeeAssignmentId_fkey"
FOREIGN KEY ("studentFeeAssignmentId") REFERENCES "StudentFeeAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
