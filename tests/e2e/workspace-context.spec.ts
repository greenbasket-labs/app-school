import { expect, test } from "@playwright/test";
import { hash } from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function seedTeacherScenario() {
  const suffix = randomBytes(5).toString("hex");
  const passwordHash = await hash("E2ePassword!234", 12);

  return db.$transaction(async (tx) => {
    const owner = await tx.user.create({
      data: {
        email: `e2e-owner-${suffix}@example.com`,
        passwordHash,
      },
    });

    const teacher = await tx.user.create({
      data: {
        email: `e2e-teacher-${suffix}@example.com`,
        passwordHash,
      },
    });

    const organization = await tx.organization.create({
      data: {
        name: `E2E Organization ${suffix}`,
        normalizedName: `e2e-org-${suffix}`,
      },
    });

    const school = await tx.school.create({
      data: {
        organizationId: organization.id,
        name: `E2E School ${suffix}`,
        normalizedName: `e2e-school-${suffix}`,
        setupStatus: "IDENTITY_READY",
      },
    });

    await tx.membership.create({
      data: {
        userId: owner.id,
        organizationId: organization.id,
        schoolId: school.id,
        isOwner: true,
        relationship: "OWNER",
      },
    });

    const teacherMembership = await tx.membership.create({
      data: {
        userId: teacher.id,
        organizationId: organization.id,
        schoolId: school.id,
        isOwner: false,
        relationship: "TEACHER",
      },
    });

    const capability = await tx.capability.upsert({
      where: { code: "STUDENTS.VIEW" },
      update: {},
      create: {
        code: "STUDENTS.VIEW",
        description: "E2E Students view capability",
      },
      select: { id: true },
    });

    await tx.membershipCapability.create({
      data: {
        membershipId: teacherMembership.id,
        capabilityId: capability.id,
        schoolId: school.id,
      },
    });

    const studentsModule = await tx.module.upsert({
      where: { code: "STUDENTS" },
      update: {},
      create: {
        code: "STUDENTS",
        name: "Students",
        description: "E2E student records module",
        category: "Core",
        sortOrder: 20,
      },
      select: { id: true },
    });

    await tx.schoolModule.create({
      data: {
        schoolId: school.id,
        moduleId: studentsModule.id,
        enabled: true,
        enabledAt: new Date(),
      },
    });

    const academicSession = await tx.academicSession.create({
      data: {
        schoolId: school.id,
        name: `2026/2027 E2E Session ${suffix}`,
        startsAt: new Date("2026-09-01T00:00:00.000Z"),
        endsAt: new Date("2027-07-31T00:00:00.000Z"),
      },
    });

    const academicTerm = await tx.academicTerm.create({
      data: {
        name: "First Term",
        order: 1,
        startsAt: new Date("2026-09-01T00:00:00.000Z"),
        endsAt: new Date("2026-12-18T00:00:00.000Z"),
        academicSessionId: academicSession.id,
      },
    });

    const classLevel = await tx.classLevel.create({
      data: { schoolId: school.id, name: "JSS 1", order: 1 },
    });

    const classArm = await tx.classArm.create({
      data: { classLevelId: classLevel.id, name: "A" },
    });

    const subject = await tx.subject.create({
      data: { schoolId: school.id, name: "Mathematics", code: `MATH-${suffix}` },
    });

    await tx.classSubject.create({
      data: {
        academicSessionId: academicSession.id,
        classArmId: classArm.id,
        subjectId: subject.id,
      },
    });

    await tx.teacherAssignment.create({
      data: {
        schoolId: school.id,
        membershipId: teacherMembership.id,
        academicSessionId: academicSession.id,
        academicTermId: academicTerm.id,
        classArmId: classArm.id,
        subjectId: subject.id,
      },
    });

    return {
      teacherId: teacher.id,
      schoolId: school.id,
    };
  });
}

async function createBrowserSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  await db.userSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return token;
}

test.describe("school workspace context", () => {
  test.afterEach(async () => {
    const schools = await db.school.findMany({
      where: { name: { startsWith: "E2E School " } },
      select: { id: true, organizationId: true },
    });

    const schoolIds = schools.map((school) => school.id);
    const organizationIds = schools.map((school) => school.organizationId);

    if (schoolIds.length) {
      const joinRequests = await db.schoolJoinRequest.findMany({
        where: { schoolId: { in: schoolIds } },
        select: { id: true },
      });
      const joinRequestIds = joinRequests.map((request) => request.id);

      if (joinRequestIds.length) {
        await db.schoolJoinRequest.deleteMany({
          where: { id: { in: joinRequestIds } },
        });
      }

      await db.auditEvent.deleteMany({
        where: { schoolId: { in: schoolIds } },
      });

      await db.teacherAssignment.deleteMany({
        where: { schoolId: { in: schoolIds } },
      });

      await db.classSubject.deleteMany({
        where: { academicSession: { schoolId: { in: schoolIds } } },
      });

      await db.academicTerm.deleteMany({
        where: { academicSession: { schoolId: { in: schoolIds } } },
      });

      await db.academicSession.deleteMany({
        where: { schoolId: { in: schoolIds } },
      });

      await db.classArm.deleteMany({
        where: { classLevel: { schoolId: { in: schoolIds } } },
      });

      await db.classLevel.deleteMany({
        where: { schoolId: { in: schoolIds } },
      });

      await db.subject.deleteMany({
        where: { schoolId: { in: schoolIds } },
      });

      await db.schoolModule.deleteMany({
        where: { schoolId: { in: schoolIds } },
      });

      const memberships = await db.membership.findMany({
        where: { schoolId: { in: schoolIds } },
        select: { id: true, userId: true },
      });

      const membershipIds = memberships.map((membership) => membership.id);
      const userIds = memberships.map((membership) => membership.userId);

      if (membershipIds.length) {
        await db.membershipCapability.deleteMany({
          where: { membershipId: { in: membershipIds } },
        });

        await db.notificationPreference.deleteMany({
          where: { membershipId: { in: membershipIds } },
        });

        await db.membership.deleteMany({
          where: { id: { in: membershipIds } },
        });
      }

      if (userIds.length) {
        await db.userSession.deleteMany({
          where: { userId: { in: userIds } },
        });

        await db.auditEvent.deleteMany({
          where: { actorUserId: { in: userIds } },
        });

        await db.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }

      await db.school.deleteMany({
        where: { id: { in: schoolIds } },
      });
    }

    if (organizationIds.length) {
      await db.organizationIdentity.deleteMany({
        where: { organizationId: { in: organizationIds } },
      });

      await db.organization.deleteMany({
        where: { id: { in: organizationIds } },
      });
    }
  });

  test("school workspace does not assume the owner role for a non-owner member", async ({ page }) => {
    const fixture = await seedTeacherScenario();
    const sessionToken = await createBrowserSession(fixture.teacherId);

    await page.context().addCookies([
      {
        name: "gb_school_session",
        value: sessionToken,
        url: "http://127.0.0.1:3000",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/app");

    await expect(
      page.getByRole("heading", { name: "Your schools" }),
    ).toBeVisible();

    await expect(
      page.getByText("Teacher", { exact: true }),
    ).toBeVisible();

    await page.getByText("Open school →").click();

    await expect(
      page.getByRole("heading", { name: /E2E School/ }),
    ).toBeVisible();

    await expect(
      page.getByText("Teacher workspace", { exact: true }),
    ).toBeVisible();

    await expect(
      page.getByText(/connected to this school as teacher/i),
    ).toHaveCount(0);

    await expect(
      page.getByText("Settings & modules →"),
    ).toHaveCount(0);

    await expect(
      page.getByText("Teacher access", { exact: true }),
    ).toBeVisible();

    await expect(page.getByText("Teaching assignments", { exact: true })).toBeVisible();
    await expect(page.getByText(/JSS 1 A · Mathematics/)).toBeVisible();
    await expect(page.getByText(/First Term/)).toBeVisible();

    await expect(
      page.getByText("Students →", { exact: true }),
    ).toBeVisible();
  });
});
