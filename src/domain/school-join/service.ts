import { Prisma, SchoolJoinRequestStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { CAPABILITIES } from "@/domain/auth/capabilities";

export class SchoolJoinAuthorizationError extends Error {}
export class SchoolJoinValidationError extends Error {}

export const SCHOOL_RELATIONSHIPS = ["STUDENT", "TEACHER", "STAFF", "CASHIER"] as const;
export type SchoolRelationship = (typeof SCHOOL_RELATIONSHIPS)[number];

function assertRelationship(value: string): SchoolRelationship {
  if (!SCHOOL_RELATIONSHIPS.includes(value as SchoolRelationship)) {
    throw new SchoolJoinValidationError("Invalid school relationship.");
  }
  return value as SchoolRelationship;
}

function assertRequestedCapabilities(values: string[]) {
  const allowedCodes = new Set(Object.values(CAPABILITIES));
  if (values.some((code) => !allowedCodes.has(code as never))) {
    throw new SchoolJoinValidationError("Invalid requested capability.");
  }
}

async function requireActiveUser(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findFirst({
    where: { id: userId, status: "ACTIVE" },
    select: { id: true, email: true },
  });
  if (!user) throw new SchoolJoinValidationError("Active SkulGo account not found.");
  return user;
}

async function requireSchool(tx: Prisma.TransactionClient, schoolId: string) {
  const school = await tx.school.findFirst({
    where: { id: schoolId, status: { in: ["SETUP", "ACTIVE"] } },
    select: { id: true, organizationId: true },
  });
  if (!school) throw new SchoolJoinValidationError("School not found or unavailable.");
  return school;
}

async function requireOwner(tx: Prisma.TransactionClient, schoolId: string, userId: string) {
  const owner = await tx.membership.findFirst({
    where: { schoolId, userId, isOwner: true, status: "ACTIVE" },
    select: { id: true },
  });
  if (!owner) throw new SchoolJoinAuthorizationError("Only the school owner can review join requests.");
  return owner;
}

export async function createSchoolJoinRequest(input: {
  schoolId: string;
  userId: string;
  requestedRelationship: string;
  requestedCapabilities?: string[];
  message?: string;
}) {
  const relationship = assertRelationship(input.requestedRelationship);
  const requestedCapabilities = input.requestedCapabilities ?? [];
  assertRequestedCapabilities(requestedCapabilities);

  return db.$transaction(async (tx) => {
    const [user, school] = await Promise.all([
      requireActiveUser(tx, input.userId),
      requireSchool(tx, input.schoolId),
    ]);

    const existingMembership = await tx.membership.findFirst({
      where: { schoolId: school.id, userId: user.id, status: { in: ["ACTIVE", "SUSPENDED"] } },
      select: { id: true },
    });
    if (existingMembership) throw new SchoolJoinValidationError("You already have a school membership.");

    const existingPending = await tx.schoolJoinRequest.findFirst({
      where: { schoolId: school.id, userId: user.id, status: SchoolJoinRequestStatus.PENDING },
      select: { id: true },
    });
    if (existingPending) throw new SchoolJoinValidationError("A join request is already pending.");

    const request = await tx.schoolJoinRequest.create({
      data: {
        schoolId: school.id,
        userId: user.id,
        requestedRelationship: relationship,
        requestedCapabilities,
        message: input.message?.trim() || null,
      },
      select: {
        id: true,
        schoolId: true,
        userId: true,
        requestedRelationship: true,
        requestedCapabilities: true,
        message: true,
        status: true,
        createdAt: true,
      },
    });

    await tx.auditEvent.create({
      data: {
        schoolId: school.id,
        actorUserId: user.id,
        action: "school_join_request.created",
        entityType: "SchoolJoinRequest",
        entityId: request.id,
        currentState: {
          status: request.status,
          requestedRelationship: relationship,
          requestedCapabilities,
        },
      },
    });

    return request;
  });
}

export async function listMySchoolJoinRequests(input: { userId: string }) {
  await db.user.findFirstOrThrow({ where: { id: input.userId, status: "ACTIVE" }, select: { id: true } });
  return db.schoolJoinRequest.findMany({
    where: { userId: input.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      schoolId: true,
      requestedRelationship: true,
      requestedCapabilities: true,
      message: true,
      status: true,
      reviewedByUserId: true,
      reviewedAt: true,
      createdAt: true,
      school: { select: { id: true, name: true, status: true } },
    },
  });
}

export async function cancelSchoolJoinRequest(input: { requestId: string; userId: string }) {
  return db.$transaction(async (tx) => {
    const request = await tx.schoolJoinRequest.findFirst({
      where: { id: input.requestId, userId: input.userId },
      select: { id: true, schoolId: true, userId: true, status: true },
    });
    if (!request) throw new SchoolJoinValidationError("Join request not found.");
    if (request.status !== SchoolJoinRequestStatus.PENDING) {
      throw new SchoolJoinValidationError("Only pending requests can be cancelled.");
    }

    const updated = await tx.schoolJoinRequest.update({
      where: { id: request.id },
      data: { status: SchoolJoinRequestStatus.CANCELLED, reviewedAt: new Date() },
      select: { id: true, schoolId: true, userId: true, status: true },
    });

    await tx.auditEvent.create({
      data: {
        schoolId: request.schoolId,
        actorUserId: input.userId,
        action: "school_join_request.cancelled",
        entityType: "SchoolJoinRequest",
        entityId: request.id,
        previousState: { status: request.status },
        currentState: { status: updated.status },
      },
    });

    return updated;
  });
}

export async function listSchoolJoinRequests(input: { schoolId: string; actorUserId: string; status?: SchoolJoinRequestStatus }) {
  return db.$transaction(async (tx) => {
    await requireOwner(tx, input.schoolId, input.actorUserId);
    await requireSchool(tx, input.schoolId);
    return tx.schoolJoinRequest.findMany({
      where: { schoolId: input.schoolId, ...(input.status ? { status: input.status } : {}) },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        schoolId: true,
        userId: true,
        requestedRelationship: true,
        requestedCapabilities: true,
        message: true,
        status: true,
        reviewedByUserId: true,
        reviewedAt: true,
        createdAt: true,
        user: { select: { id: true, email: true, status: true } },
      },
    });
  });
}

export async function reviewSchoolJoinRequest(input: {
  schoolId: string;
  actorUserId: string;
  requestId: string;
  decision: "APPROVE" | "REJECT";
  relationship?: string;
  capabilityCodes?: string[];
}) {
  const decisionRelationship = input.relationship ? assertRelationship(input.relationship) : undefined;
  const capabilityCodes = input.capabilityCodes ?? [];
  assertRequestedCapabilities(capabilityCodes);

  return db.$transaction(async (tx) => {
    const owner = await requireOwner(tx, input.schoolId, input.actorUserId);
    const school = await requireSchool(tx, input.schoolId);
    const request = await tx.schoolJoinRequest.findFirst({
      where: { id: input.requestId, schoolId: school.id },
      select: {
        id: true,
        schoolId: true,
        userId: true,
        requestedRelationship: true,
        status: true,
      },
    });
    if (!request) throw new SchoolJoinValidationError("Join request not found.");
    if (request.status !== SchoolJoinRequestStatus.PENDING) {
      throw new SchoolJoinValidationError("Only pending requests can be reviewed.");
    }

    const reviewedAt = new Date();
    if (input.decision === "REJECT") {
      const rejected = await tx.schoolJoinRequest.update({
        where: { id: request.id },
        data: {
          status: SchoolJoinRequestStatus.REJECTED,
          reviewedByUserId: input.actorUserId,
          reviewedAt,
        },
      });

      await tx.auditEvent.create({
        data: {
          schoolId: school.id,
          actorUserId: input.actorUserId,
          action: "school_join_request.rejected",
          entityType: "SchoolJoinRequest",
          entityId: request.id,
          previousState: { status: request.status },
          currentState: { status: rejected.status },
          metadata: { ownerMembershipId: owner.id },
        },
      });
      return rejected;
    }

    const relationship = decisionRelationship ?? assertRelationship(request.requestedRelationship);
    const existingMembership = await tx.membership.findUnique({
      where: { userId_schoolId: { userId: request.userId, schoolId: school.id } },
      select: { id: true, status: true, organizationId: true, isOwner: true },
    });
    if (existingMembership?.isOwner) throw new SchoolJoinValidationError("The school owner membership cannot be changed through a join request.");

    let membership;
    if (!existingMembership) {
      membership = await tx.membership.create({
        data: {
          userId: request.userId,
          organizationId: school.organizationId,
          schoolId: school.id,
          relationship,
          status: "ACTIVE",
          isOwner: false,
        },
        select: { id: true, userId: true, status: true, relationship: true },
      });
    } else {
      membership = await tx.membership.update({
        where: { id: existingMembership.id },
        data: { status: "ACTIVE", relationship },
        select: { id: true, userId: true, status: true, relationship: true },
      });
      await tx.membershipCapability.deleteMany({ where: { membershipId: membership.id } });
    }

    if (capabilityCodes.length) {
      const capabilities = await tx.capability.findMany({
        where: { code: { in: capabilityCodes } },
        select: { id: true, code: true },
      });
      if (capabilities.length !== capabilityCodes.length) throw new SchoolJoinValidationError("One or more selected capabilities are not available.");
      await tx.membershipCapability.createMany({
        data: capabilities.map((capability) => ({
          membershipId: membership.id,
          capabilityId: capability.id,
          schoolId: school.id,
        })),
      });
    }

    const approved = await tx.schoolJoinRequest.update({
      where: { id: request.id },
      data: {
        status: SchoolJoinRequestStatus.APPROVED,
        reviewedByUserId: input.actorUserId,
        reviewedAt,
      },
      select: { id: true, schoolId: true, userId: true, status: true, reviewedAt: true },
    });

    await tx.auditEvent.createMany({
      data: [
        {
          schoolId: school.id,
          actorUserId: input.actorUserId,
          action: "school_join_request.approved",
          entityType: "SchoolJoinRequest",
          entityId: request.id,
          previousState: { status: request.status },
          currentState: { status: approved.status },
          metadata: { ownerMembershipId: owner.id, membershipId: membership.id, relationship, capabilityCodes },
        },
        {
          schoolId: school.id,
          actorUserId: input.actorUserId,
          action: "membership.activated_from_join_request",
          entityType: "Membership",
          entityId: membership.id,
          currentState: { userId: membership.userId, relationship: membership.relationship, capabilityCodes },
          metadata: { joinRequestId: request.id, ownerMembershipId: owner.id },
        },
      ],
    });

    return { request: approved, membership };
  });
}
