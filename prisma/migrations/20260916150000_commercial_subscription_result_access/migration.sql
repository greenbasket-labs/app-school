-- Commercial billing is intentionally separate from school fee/invoice payment records.
CREATE TYPE "CommercialPlanCode" AS ENUM ('FREE', 'BASIC', 'STARTER', 'PRO', 'PREMIUM', 'CUSTOM');
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'ANNUAL');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED');

CREATE TABLE "SchoolSubscription" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "planCode" "CommercialPlanCode" NOT NULL DEFAULT 'FREE',
    "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMPTZ(6),
    "currentPeriodEnd" TIMESTAMPTZ(6),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SchoolSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResultAccessSetting" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "amountNaira" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ResultAccessSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolSubscription_schoolId_key" ON "SchoolSubscription"("schoolId");
CREATE INDEX "SchoolSubscription_planCode_status_idx" ON "SchoolSubscription"("planCode", "status");
CREATE INDEX "SchoolSubscription_currentPeriodEnd_idx" ON "SchoolSubscription"("currentPeriodEnd");
CREATE UNIQUE INDEX "ResultAccessSetting_schoolId_key" ON "ResultAccessSetting"("schoolId");

ALTER TABLE "SchoolSubscription"
  ADD CONSTRAINT "SchoolSubscription_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ResultAccessSetting"
  ADD CONSTRAINT "ResultAccessSetting_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
