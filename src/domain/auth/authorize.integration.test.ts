import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";

const describeDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeDatabase("authorization tenant isolation — real PostgreSQL", () => {
  const suffix = `authz-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let userId = "";
  let organizationId = "";
  let schoolAId = "";
  let schoolBId = "";
  let membershipAId = "";
  let capabilityId = "";

  afterAll(async () => {
    if (membershipAId) {
      await db.membershipCapability.deleteMany({ where: { membershipId: membershipAId } });
      await db.membership.delete({ where: { id: membershipAId } }).catch(() => undefined);
    }
    if (schoolAId || schoolBId) {
      await db.school.deleteMany({ where: { id: { in: [schoolAId, schoolBId].filter(Boolean) } } });
    }
    if (userId) await db.user.delete({ where: { id: userId } }).catch(() => undefined);
    if (organizationId) await db.organization.delete({ where: { id: organizationId } }).catch(() => undefined);
    if (capabilityId) await db.capability.delete({ where: { id: capabilityId } }).catch(() => undefined);
    await db.$disconnect();
  });

  it("allows the user's active capability in School A", async () => {
    const org = await db.organization.create({
      data: { name: `Isolation Org ${suffix}`, normalizedName: `isolation-org-${suffix}` },
    });

    const [schoolA, schoolB, user, capability] = await Promise.all([
      db.school.create({
        data: {
          organizationId: org.id,
          name: `School A ${suffix}`,
          normalizedName: `school-a-${suffix}`,
        },
      }),
      db.school.create({
        data: {
          organizationId: org.id,
          name: `School B ${suffix}`,
          normalizedName: `school-b-${suffix}`,
        },
      }),
      db.user.create({
        data: {
          email: `${suffix}@example.test`,
          passwordHash: "integration-test",
        },
      }),
      db.capability.create({
        data: { code: `TEST_VIEW_STUDENTS_${suffix}`, description: "Integration test capability" },
      }),
    ]);

    organizationId = org.id;
    userId = user.id;
    schoolAId = schoolA.id;
    schoolBId = schoolB.id;
    capabilityId = capability.id;

    const membership = await db.membership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        schoolId: schoolA.id,
        relationship: "STAFF",
        capabilities: {
          create: {
            capabilityId: capability.id,
            schoolId: schoolA.id,
          },
        },
      },
    });
    membershipAId = membership.id;

    await expect(
      requireCapability(user.id, schoolA.id, capability.code),
    ).resolves.toMatchObject({ schoolId: schoolA.id, userId: user.id });
  });

  it("rejects the same user and capability when the requested school is School B", async () => {
    const capability = await db.capability.findUniqueOrThrow({ where: { id: capabilityId } });

    await expect(
      requireCapability(userId, schoolBId, capability.code),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
