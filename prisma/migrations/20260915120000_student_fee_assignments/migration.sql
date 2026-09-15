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
