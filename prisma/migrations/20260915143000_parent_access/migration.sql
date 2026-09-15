CREATE TABLE "ParentAccessInvitation" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "schoolId" UUID NOT NULL,
  "guardianId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "usedAt" TIMESTAMPTZ(6),
  "createdByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "ParentAccessInvitation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT,
  CONSTRAINT "ParentAccessInvitation_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE RESTRICT,
  CONSTRAINT "ParentAccessInvitation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT
);

ALTER TABLE "Guardian" ADD COLUMN "userId" UUID;
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
CREATE UNIQUE INDEX "Guardian_userId_key" ON "Guardian"("userId");
CREATE INDEX "ParentAccessInvitation_schoolId_createdAt_idx" ON "ParentAccessInvitation"("schoolId", "createdAt");
CREATE INDEX "ParentAccessInvitation_guardianId_usedAt_idx" ON "ParentAccessInvitation"("guardianId", "usedAt");
