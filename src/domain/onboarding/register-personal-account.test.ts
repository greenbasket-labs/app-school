import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { registerPersonalAccount, PersonalRegistrationConflictError } from "./register-personal-account";

const { userCreate } = vi.hoisted(() => ({
  userCreate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      create: userCreate,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
}));

describe("registerPersonalAccount", () => {
  beforeEach(() => userCreate.mockReset());

  it("creates only a personal User identity", async () => {
    userCreate.mockResolvedValue({
      id: "user-1",
      email: "person@example.com",
      status: "ACTIVE",
      createdAt: new Date("2026-09-17T00:00:00.000Z"),
    });

    const result = await registerPersonalAccount({
      email: "person@example.com",
      password: "long-enough-password",
    });

    expect(result.id).toBe("user-1");
    expect(userCreate).toHaveBeenCalledTimes(1);
    expect(userCreate).toHaveBeenCalledWith({
      data: { email: "person@example.com", passwordHash: "hashed-password" },
      select: { id: true, email: true, status: true, createdAt: true },
    });
  });

  it("maps duplicate email to a registration conflict", async () => {
    userCreate.mockImplementation(() => {
      throw {
        code: "P2002",
        meta: { target: ["email"] },
      };
    });

    await expect(
      registerPersonalAccount({ email: "person@example.com", password: "long-enough-password" }),
    ).rejects.toBeInstanceOf(PersonalRegistrationConflictError);
  });
});
