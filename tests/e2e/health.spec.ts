import { test, expect } from "@playwright/test";

test("health endpoint is reachable", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    ok: true,
    database: "ok",
  });
});
