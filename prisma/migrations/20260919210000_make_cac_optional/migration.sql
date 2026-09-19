-- CAC identity is optional during initial school onboarding.
ALTER TABLE "OrganizationIdentity"
  ALTER COLUMN "cacNumber" DROP NOT NULL,
  ALTER COLUMN "normalizedCacNumber" DROP NOT NULL;
