import { test, expect } from "@playwright/test";

test.describe("school workspace context", () => {
  test("school workspace does not assume the owner role for a non-owner member", async ({ page }) => {
    // This is a structural browser contract test. Seeded test data can be wired into
    // this scenario once the PostgreSQL fixture layer is added in the next V1 slice.
    test.skip(true, "Requires the shared PostgreSQL fixture/auth setup from the identity E2E slice.");
    await page.goto("/app/schools/example-school");
    await expect(page.getByText(/connected to this school as teacher/i)).toBeVisible();
    await expect(page.getByText("Settings & modules →")).toHaveCount(0);
  });
});
