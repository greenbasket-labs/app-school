/*
  Warnings:

  - You are about to drop the column `createdAt` on the `FeeStructure` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `FeeStructure` table. All the data in the column will be lost.
  - You are about to drop the `IdempotencyRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ParentAccessInvitation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentIntent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlatformJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RuleDefinition` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SchoolPaymentProvider` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentFeeAssignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentFeeInvoice` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AdmissionApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- DropForeignKey
ALTER TABLE "Guardian" DROP CONSTRAINT "Guardian_userId_fkey";

-- DropForeignKey
ALTER TABLE "GuardianNotificationPreference" DROP CONSTRAINT "GuardianNotificationPreference_guardianId_fkey";

-- DropForeignKey
ALTER TABLE "GuardianNotificationPreference" DROP CONSTRAINT "GuardianNotificationPreference_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "GuardianNotificationRecipient" DROP CONSTRAINT "GuardianNotificationRecipient_guardianId_fkey";

-- DropForeignKey
ALTER TABLE "GuardianNotificationRecipient" DROP CONSTRAINT "GuardianNotificationRecipient_notificationId_fkey";

-- DropForeignKey
ALTER TABLE "GuardianNotificationRecipient" DROP CONSTRAINT "GuardianNotificationRecipient_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "IdempotencyRecord" DROP CONSTRAINT "IdempotencyRecord_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationPreference" DROP CONSTRAINT "NotificationPreference_membershipId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationRecipient" DROP CONSTRAINT "NotificationRecipient_membershipId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationRecipient" DROP CONSTRAINT "NotificationRecipient_notificationId_fkey";

-- DropForeignKey
ALTER TABLE "ParentAccessInvitation" DROP CONSTRAINT "ParentAccessInvitation_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "ParentAccessInvitation" DROP CONSTRAINT "ParentAccessInvitation_guardianId_fkey";

-- DropForeignKey
ALTER TABLE "ParentAccessInvitation" DROP CONSTRAINT "ParentAccessInvitation_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentIntent" DROP CONSTRAINT "PaymentIntent_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentIntent" DROP CONSTRAINT "PaymentIntent_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentRecord" DROP CONSTRAINT "PaymentRecord_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentRecord" DROP CONSTRAINT "PaymentRecord_recordedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentRecord" DROP CONSTRAINT "PaymentRecord_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentRecord" DROP CONSTRAINT "PaymentRecord_studentId_fkey";

-- DropForeignKey
ALTER TABLE "PlatformJob" DROP CONSTRAINT "PlatformJob_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "RuleDefinition" DROP CONSTRAINT "RuleDefinition_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "SchoolPaymentProvider" DROP CONSTRAINT "SchoolPaymentProvider_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "StudentFeeAssignment" DROP CONSTRAINT "StudentFeeAssignment_feeStructureId_fkey";

-- DropForeignKey
ALTER TABLE "StudentFeeAssignment" DROP CONSTRAINT "StudentFeeAssignment_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "StudentFeeAssignment" DROP CONSTRAINT "StudentFeeAssignment_studentId_fkey";

-- DropForeignKey
ALTER TABLE "StudentFeeInvoice" DROP CONSTRAINT "StudentFeeInvoice_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "StudentFeeInvoice" DROP CONSTRAINT "StudentFeeInvoice_studentFeeAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "StudentFeeInvoice" DROP CONSTRAINT "StudentFeeInvoice_studentId_fkey";

-- DropIndex
DROP INDEX "GuardianNotificationRecipient_guardianId_readAt_idx";

-- DropIndex
DROP INDEX "GuardianNotificationRecipient_schoolId_guardianId_idx";

-- DropIndex
DROP INDEX "Notification_schoolId_createdAt_idx";

-- AlterTable
ALTER TABLE "AssessmentDefinition" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AssessmentScore" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FeeStructure" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "GuardianNotificationPreference" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GuardianNotificationRecipient" ALTER COLUMN "readAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "NotificationPreference" ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "NotificationRecipient" ALTER COLUMN "readAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SchoolModule" ALTER COLUMN "enabledAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "disabledAt" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "IdempotencyRecord";

-- DropTable
DROP TABLE "ParentAccessInvitation";

-- DropTable
DROP TABLE "PaymentIntent";

-- DropTable
DROP TABLE "PaymentRecord";

-- DropTable
DROP TABLE "PlatformJob";

-- DropTable
DROP TABLE "RuleDefinition";

-- DropTable
DROP TABLE "SchoolPaymentProvider";

-- DropTable
DROP TABLE "StudentFeeAssignment";

-- DropTable
DROP TABLE "StudentFeeInvoice";

-- CreateTable
CREATE TABLE "AdmissionApplication" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "applicantUserId" UUID NOT NULL,
    "academicSessionId" UUID NOT NULL,
    "classLevelId" UUID NOT NULL,
    "classArmId" UUID,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" DATE,
    "status" "AdmissionApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(6),
    "reviewedByUserId" UUID,
    "rejectionReason" TEXT,
    "studentId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AdmissionApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionApplication_studentId_key" ON "AdmissionApplication"("studentId");

-- CreateIndex
CREATE INDEX "AdmissionApplication_schoolId_status_idx" ON "AdmissionApplication"("schoolId", "status");

-- CreateIndex
CREATE INDEX "AdmissionApplication_schoolId_submittedAt_idx" ON "AdmissionApplication"("schoolId", "submittedAt");

-- CreateIndex
CREATE INDEX "AdmissionApplication_applicantUserId_schoolId_idx" ON "AdmissionApplication"("applicantUserId", "schoolId");

-- CreateIndex
CREATE INDEX "AdmissionApplication_academicSessionId_classLevelId_idx" ON "AdmissionApplication"("academicSessionId", "classLevelId");

-- CreateIndex
CREATE INDEX "AdmissionApplication_classArmId_idx" ON "AdmissionApplication"("classArmId");

-- CreateIndex
CREATE INDEX "AdmissionApplication_reviewedByUserId_idx" ON "AdmissionApplication"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "AdmissionApplication_studentId_idx" ON "AdmissionApplication"("studentId");

-- CreateIndex
CREATE INDEX "GuardianNotificationPreference_schoolId_guardianId_idx" ON "GuardianNotificationPreference"("schoolId", "guardianId");

-- CreateIndex
CREATE INDEX "GuardianNotificationRecipient_schoolId_guardianId_readAt_idx" ON "GuardianNotificationRecipient"("schoolId", "guardianId", "readAt");

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_academicSessionId_fkey" FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "ClassLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_classArmId_fkey" FOREIGN KEY ("classArmId") REFERENCES "ClassArm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianNotificationPreference" ADD CONSTRAINT "GuardianNotificationPreference_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianNotificationPreference" ADD CONSTRAINT "GuardianNotificationPreference_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianNotificationRecipient" ADD CONSTRAINT "GuardianNotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianNotificationRecipient" ADD CONSTRAINT "GuardianNotificationRecipient_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianNotificationRecipient" ADD CONSTRAINT "GuardianNotificationRecipient_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "AssessmentDefinition_schoolId_academicSessionId_academicTermId_" RENAME TO "AssessmentDefinition_schoolId_academicSessionId_academicTer_idx";

-- RenameIndex
ALTER INDEX "AssessmentDefinition_schoolId_academicTermId_classArmId_subject" RENAME TO "AssessmentDefinition_schoolId_academicTermId_classArmId_sub_key";

-- RenameIndex
ALTER INDEX "AssessmentScore_schoolId_academicSessionId_classArmId_subjectId" RENAME TO "AssessmentScore_schoolId_academicSessionId_classArmId_subje_idx";
