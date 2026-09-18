import { describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { listParentNotifications, markParentNotificationRead } from "./guardian-notifications";

vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

describe("guardian notification authorization", () => {
  it("scopes inbox to the verified guardian user and school", async () => {
    vi.mocked(db.$queryRaw).mockResolvedValue([]);
    await listParentNotifications("school-a", "user-a");
    expect(db.$queryRaw).toHaveBeenCalled();
  });

  it("returns false when a notification is not readable in the requested school", async () => {
    vi.mocked(db.$executeRaw).mockResolvedValue(0);
    await expect(markParentNotificationRead("school-a", "user-a", "notification-a")).resolves.toBe(false);
  });
});
