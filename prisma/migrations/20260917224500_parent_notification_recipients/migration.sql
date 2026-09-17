CREATE TABLE "GuardianNotificationPreference" (
  "schoolId" UUID NOT NULL,
  "guardianId" UUID NOT NULL,
  "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
  "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
  "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  PRIMARY KEY ("schoolId", "guardianId"),
  CONSTRAINT "GuardianNotificationPreference_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT,
  CONSTRAINT "GuardianNotificationPreference_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE
);

CREATE TABLE "GuardianNotificationRecipient" (
  "notificationId" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "guardianId" UUID NOT NULL,
  "readAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  PRIMARY KEY ("notificationId", "guardianId"),
  CONSTRAINT "GuardianNotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE,
  CONSTRAINT "GuardianNotificationRecipient_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT,
  CONSTRAINT "GuardianNotificationRecipient_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE
);

CREATE INDEX "GuardianNotificationRecipient_guardianId_readAt_idx" ON "GuardianNotificationRecipient"("guardianId", "readAt");
CREATE INDEX "GuardianNotificationRecipient_schoolId_guardianId_idx" ON "GuardianNotificationRecipient"("schoolId", "guardianId");
