-- Provider webhooks are system events, not authenticated school-user actions.
ALTER TABLE "PaymentRecord"
  ALTER COLUMN "recordedByUserId" DROP NOT NULL;
