CREATE TYPE "SchoolJoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

ALTER TABLE "User"
  ADD COLUMN "schoolJoinRequests" TEXT;

ALTER TABLE "School"
  ADD COLUMN "joinRequests" TEXT;

CREATE TABLE "SchoolJoinRequest" (
  "id" UUID NOT NULL,
  "schoolId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "requestedRelationship" TEXT NOT NULL,
  "requestedCapabilities" JSONB,
  "message" TEXT,
  "status" "SchoolJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedByUserId" UUID,
  "reviewedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "SchoolJoinRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SchoolJoinRequest_schoolId_status_createdAt_idx" ON "SchoolJoinRequest"("schoolId", "status", "createdAt");
CREATE INDEX "SchoolJoinRequest_userId_status_createdAt_idx" ON "SchoolJoinRequest"("userId", "status", "createdAt");
ALTER TABLE "SchoolJoinRequest" ADD CONSTRAINT "SchoolJoinRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolJoinRequest" ADD CONSTRAINT "SchoolJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SchoolJoinRequest" ADD CONSTRAINT "SchoolJoinRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
