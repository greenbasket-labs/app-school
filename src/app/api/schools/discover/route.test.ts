import { describe, expect, it, vi, beforeEach } from "vitest";

const { currentSession, schoolFindMany } = vi.hoisted(() => ({
  currentSession: vi.fn(),
  schoolFindMany: vi.fn(),
}));

vi.mock("@/domain/auth/session-cookie", () => ({ currentSession }));
vi.mock("@/lib/db", () => ({ db: { school: { findMany: schoolFindMany } } }));

import { GET } from "./route";

describe("GET /api/schools/discover", () => {
  beforeEach(() => {
    currentSession.mockReset();
    schoolFindMany.mockReset();
  });

  it("requires an authenticated SkulGo account", async () => {
    currentSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/schools/discover?q=green"));
    expect(response.status).toBe(401);
    expect(schoolFindMany).not.toHaveBeenCalled();
  });

  it("rejects an empty search", async () => {
    currentSession.mockResolvedValue({ user: { id: "user-1" } });

    const response = await GET(new Request("http://localhost/api/schools/discover?q="));
    expect(response.status).toBe(400);
    expect(schoolFindMany).not.toHaveBeenCalled();
  });

  it("returns only safe school identity fields for available schools", async () => {
    currentSession.mockResolvedValue({ user: { id: "user-1" } });
    schoolFindMany.mockResolvedValue([
      {
        id: "school-1",
        name: "Green Basket School",
        status: "ACTIVE",
        organization: { name: "Green Basket Global Limited" },
      },
    ]);

    const response = await GET(new Request("http://localhost/api/schools/discover?q=green"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      schools: [
        {
          id: "school-1",
          name: "Green Basket School",
          organizationName: "Green Basket Global Limited",
          status: "ACTIVE",
        },
      ],
    });

    expect(schoolFindMany).toHaveBeenCalledWith({
      where: {
        status: { in: ["SETUP", "ACTIVE"] },
        normalizedName: { contains: "green" },
      },
      orderBy: { name: "asc" },
      take: 20,
      select: {
        id: true,
        name: true,
        status: true,
        organization: { select: { name: true } },
      },
    });
  });
});
