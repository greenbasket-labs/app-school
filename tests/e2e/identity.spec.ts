import { test, expect } from "@playwright/test";

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
}

test("personal account can be created and then signed in", async ({ page }) => {
  const email = uniqueEmail();
  const password = "E2E-Strong-Password-123";

  await page.goto("/signup");

  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create SkulGo account" }).click();

  await expect(page).toHaveURL(/\/login\?registered=1&email=/);
  await expect(page.getByText("Your personal account is ready. Sign in below.")).toBeVisible();

  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Welcome to SkulGo" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByRole("link", { name: /Find a school/ })).toBeVisible();
});

test("invalid credentials are rejected by the browser flow", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("missing-user@example.test");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("alert")).toContainText("Unable to sign in");
});
