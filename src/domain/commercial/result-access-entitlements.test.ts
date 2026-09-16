import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeRaw, queryRaw } = vi.hoisted(() => ({
  executeRaw: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { $executeRaw: executeRaw, $queryRaw: queryRaw },
}));

import {
  grantResultAccessEntitlement,
  hasResultAccessEntitlement,
  ResultAccessEntitlementError,
} from "./result-access-entitlements";

describe("result access entitlements", () => {
  beforeEach(() => {
    executeRaw.mockReset();
    queryRaw.mockReset();
    executeRaw.mockResolvedValue(1);
  });

  it("grants entitlement from an existing verified transaction", async () => {
    queryRaw
      .mockResolvedValueOnce([{
        id: "tx-1",
        schoolId: "school-1",
        studentId: "student-1",
        academicSessionId: "session-1",
        academicTermId: "term-1",
      }])
      .mockResolvedValueOnce([{
        id: "entitlement-1",
        schoolId: "school-1",
        studentId: "student-1",
        academicSessionId: "session-1",
        academicTermId: "term-1",
        transactionId: "tx-1",
        grantedAt: new Date("2026-09-16T12:00:00.000Z"),
      }]);

    const entitlement = await grantResultAccessEntitlement({ transactionId: "tx-1" });

    expect(entitlement.transactionId).toBe("tx-1");
    expect(entitlement.studentId).toBe("student-1");
    expect(executeRaw).toHaveBeenCalledOnce();
  });

  it("does not invent access when the transaction is missing", async () => {
    queryRaw.mockResolvedValueOnce([]);

    await expect(
      grantResultAccessEntitlement({ transactionId: "missing" }),
    ).rejects.toBeInstanceOf(ResultAccessEntitlementError);
    expect(executeRaw).not.toHaveBeenCalled();
  });

  it("reports an existing student/session/term entitlement", async () => {
    queryRaw.mockResolvedValueOnce([{ id: "entitlement-1" }]);

    await expect(hasResultAccessEntitlement({
      schoolId: "school-1",
      studentId: "student-1",
      academicSessionId: "session-1",
      academicTermId: "term-1",
    })).resolves.toBe(true);
  });

  it("reports no entitlement when none exists", async () => {
    queryRaw.mockResolvedValueOnce([]);

    await expect(hasResultAccessEntitlement({
      schoolId: "school-1",
      studentId: "student-1",
      academicSessionId: "session-1",
      academicTermId: "term-1",
    })).resolves.toBe(false);
  });
});
