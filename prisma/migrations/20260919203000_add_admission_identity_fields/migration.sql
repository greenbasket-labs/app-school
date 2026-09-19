-- Admission identity configuration belongs to the School record.
-- Keep this migration idempotent because earlier development environments may
-- already have these columns from schema synchronization.

ALTER TABLE "School"
  ADD COLUMN IF NOT EXISTS "schoolType" TEXT NOT NULL DEFAULT 'CUSTOM',
  ADD COLUMN IF NOT EXISTS "admissionPrefix" TEXT,
  ADD COLUMN IF NOT EXISTS "admissionSequence" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Student"
  ADD COLUMN IF NOT EXISTS "schoolTypeAtAdmission" TEXT;
