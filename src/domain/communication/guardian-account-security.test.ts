import { describe, expect, it, vi } from "vitest";

const { queryRaw, executeRaw, findUnique, update } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  executeRaw: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: queryRaw,
    $executeRaw: executeRaw,
    user: { findUnique, update },
    $transaction: async (callback: (tx: unknown) => unknown) => callback({
      user: { update },
      $executeRaw: executeRaw,
    }),
  },
}));

import {
  changeGuardianFirstLoginPassword,
  getGuardianAccountSecurityByUserId,
} from "./guardian-account-security";
import { hash } from "bcryptjs";

describe("guardian account security", () => {
  it("returns no security state for a non-guardian user", async () => {
    queryRaw.mockResolvedValueOnce([]);
    await expect(getGuardianAccountSecurityByUserId("00000000-0000-0000-0000-000000000001")).resolves.toBeNull();
  });

  it("requires the first-login password change", async () => {
    const currentPassword = "temporary-password-123";
    const storedHash = await hash(currentPassword, 4);
    queryRaw.mockResolvedValueOnce([{
      guardianId: "00000000-0000-0000-0000-000000000002",
      userId: "00000000-0000-0000-0000-000000000001",
      mustChangePassword: true,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: null,
    }]);
    findUnique.mockResolvedValueOnce({ passwordHash: storedHash });
    update.mockResolvedValueOnce({});
    executeRaw.mockResolvedValueOnce(1);

    await expect(changeGuardianFirstLoginPassword({
      userId: "00000000-0000-0000-0000-000000000001",
      currentPassword,
      newPassword: "a-new-password-123",
    })).resolves.toBeUndefined();
    expect(update).toHaveBeenCalled();
    expect(executeRaw).toHaveBeenCalled();
  });
});
