import { describe, expect, it } from "vitest";
import { nextRetryAt } from "./retry-policy";

describe("retry policy", () => {
  it("uses bounded exponential backoff", () => {
    const now = new Date("2026-09-16T08:00:00.000Z");
    expect(nextRetryAt(1, now).toISOString()).toBe("2026-09-16T08:00:30.000Z");
    expect(nextRetryAt(2, now).toISOString()).toBe("2026-09-16T08:01:00.000Z");
    expect(nextRetryAt(3, now).toISOString()).toBe("2026-09-16T08:02:00.000Z");
    expect(nextRetryAt(10, now).toISOString()).toBe("2026-09-16T08:10:00.000Z");
  });
});
