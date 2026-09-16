CREATE TABLE "GuardianAccountSecurity" (
  "guardianId" UUID PRIMARY KEY,
  "userId" UUID NOT NULL UNIQUE,
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
  "emailVerifiedAt" TIMESTAMPTZ(6),
  "phoneVerifiedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "GuardianAccountSecurity_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE,
  CONSTRAINT "GuardianAccountSecurity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "GuardianAccountSecurity_userId_idx" ON "GuardianAccountSecurity"("userId");
CREATE INDEX "GuardianAccountSecurity_emailVerifiedAt_idx" ON "GuardianAccountSecurity"("emailVerifiedAt");
CREATE INDEX "GuardianAccountSecurity_phoneVerifiedAt_idx" ON "GuardianAccountSecurity"("phoneVerifiedAt");
