CREATE TABLE "AdmissionSequence" (
    "schoolId" UUID NOT NULL,
    "admissionYear" INTEGER NOT NULL,
    "sectionCode" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdmissionSequence_pkey" PRIMARY KEY ("schoolId", "admissionYear", "sectionCode")
);

CREATE INDEX "AdmissionSequence_schoolId_admissionYear_idx"
ON "AdmissionSequence"("schoolId", "admissionYear");

ALTER TABLE "AdmissionSequence"
ADD CONSTRAINT "AdmissionSequence_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
