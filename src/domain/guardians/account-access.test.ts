import { describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { listVerifiedGuardianChildren, requireVerifiedGuardianChildAccess } from "./account-access";

vi.mock("@/lib/db", () => ({
  db: {
    student: { findMany: vi.fn(), findFirst: vi.fn() },
    guardian: { findFirst: vi.fn() },
    studentGuardian: { findFirst: vi.fn() },
  },
}));

describe("guardian account authorization", () => {
  it("rejects an account that is not a verified guardian", async () => {
    vi.mocked(db.student.findMany).mockResolvedValue([]);
    vi.mocked(db.guardian.findFirst).mockResolvedValue(null);

    await expect(listVerifiedGuardianChildren("school-a", "user-a")).rejects.toThrow(
      "Verified guardian access is required.",
    );
  });

  it("returns only children linked through a verified guardian in the same school", async () => {
    vi.mocked(db.student.findMany).mockResolvedValue([
      { id: "student-a", admissionNumber: "001", firstName: "A", middleName: null, lastName: "Child" },
    ] as never);

    await expect(listVerifiedGuardianChildren("school-a", "user-a")).resolves.toEqual([
      { id: "student-a", admissionNumber: "001", firstName: "A", middleName: null, lastName: "Child" },
    ]);
    expect(db.student.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        schoolId: "school-a",
        studentGuardians: {
          some: {
            schoolId: "school-a",
            guardian: {
              schoolId: "school-a",
              userId: "user-a",
              accountVerifiedAt: { not: null },
            },
          },
        },
      }),
    }));
  });

  it("rejects direct child access when the guardian link is not verified", async () => {
    vi.mocked(db.studentGuardian.findFirst).mockResolvedValue(null);

    await expect(
      requireVerifiedGuardianChildAccess({ schoolId: "school-a", userId: "user-a", studentId: "student-b" }),
    ).rejects.toThrow("You are not verified as a guardian for this student in this school.");
  });
});
