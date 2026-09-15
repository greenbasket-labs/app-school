CREATE TABLE "FeeStructure" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicSessionId" UUID NOT NULL,
    "academicTermId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12, 2) NOT NULL,
    "description" TEXT,
    "dueDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeeStructure_schoolId_academicTermId_name_key"
ON "FeeStructure"("schoolId", "academicTermId", "name");

CREATE INDEX "FeeStructure_schoolId_academicSessionId_academicTermId_idx"
ON "FeeStructure"("schoolId", "academicSessionId", "academicTermId");

CREATE INDEX "FeeStructure_schoolId_isActive_idx"
ON "FeeStructure"("schoolId", "isActive");

ALTER TABLE "FeeStructure"
ADD CONSTRAINT "FeeStructure_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FeeStructure"
ADD CONSTRAINT "FeeStructure_academicSessionId_fkey"
FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FeeStructure"
ADD CONSTRAINT "FeeStructure_academicTermId_fkey"
FOREIGN KEY ("academicTermId") REFERENCES "AcademicTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
