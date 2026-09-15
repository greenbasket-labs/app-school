CREATE TABLE "RuleDefinition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "config" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "updatedByUserId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RuleDefinition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RuleDefinition_schoolId_code_key" ON "RuleDefinition"("schoolId", "code");
CREATE INDEX "RuleDefinition_schoolId_enabled_idx" ON "RuleDefinition"("schoolId", "enabled");
ALTER TABLE "RuleDefinition" ADD CONSTRAINT "RuleDefinition_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PlatformJob" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMPTZ(6),
  "lastError" TEXT,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformJob_schoolId_type_idempotencyKey_key" ON "PlatformJob"("schoolId", "type", "idempotencyKey");
CREATE INDEX "PlatformJob_status_availableAt_idx" ON "PlatformJob"("status", "availableAt");
CREATE INDEX "PlatformJob_schoolId_type_idx" ON "PlatformJob"("schoolId", "type");
ALTER TABLE "PlatformJob" ADD CONSTRAINT "PlatformJob_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "IdempotencyRecord" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "result" JSONB,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IdempotencyRecord_schoolId_key_operation_key" ON "IdempotencyRecord"("schoolId", "key", "operation");
CREATE INDEX "IdempotencyRecord_schoolId_createdAt_idx" ON "IdempotencyRecord"("schoolId", "createdAt");
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
