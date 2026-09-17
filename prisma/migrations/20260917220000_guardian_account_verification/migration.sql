-- Establish the V1 distinction between a guardian record and a verified
-- personal SkulGo account. Existing Guardian.userId links remain compatible,
-- but access must be granted only when this verification flag is true.
ALTER TABLE "Guardian"
ADD COLUMN "accountVerifiedAt" TIMESTAMPTZ(6),
ADD COLUMN "accountVerifiedByUserId" UUID;

ALTER TABLE "Guardian"
ADD CONSTRAINT "Guardian_accountVerifiedByUserId_fkey"
FOREIGN KEY ("accountVerifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Guardian_schoolId_userId_accountVerifiedAt_idx"
ON "Guardian"("schoolId", "userId", "accountVerifiedAt");

CREATE INDEX "Guardian_accountVerifiedByUserId_idx"
ON "Guardian"("accountVerifiedByUserId");
