-- Provider-confirmed payments are system-recorded, so recordedByUserId may be NULL.
ALTER TABLE "PaymentRecord"
  ALTER COLUMN "recordedByUserId" DROP NOT NULL;
