import { test, expect } from "@playwright/test";

test("login page exposes personal-account and school-owner entry points", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("link", { name: "Create one" })).toHaveAttribute("href", "/signup");
  await expect(page.getByRole("link", { name: "Create a school" })).toHaveAttribute("href", "/register");
});

test("school registration page exposes the owner onboarding fields", async ({ page }) => {
  await page.goto("/register");

  await expect(page.getByRole("heading", { name: "Register your school" })).toBeVisible();
  await expect(page.getByLabel("Organization / registered business name")).toBeVisible();
  await expect(page.getByLabel("School name")).toBeVisible();
  await expect(page.getByLabel("CAC registration number")).toBeVisible();
  await expect(page.getByLabel("Owner email")).toBeVisible();
  await expect(page.getByLabel("Password (minimum 12 characters)")).toBeVisible();
});

test("personal signup page is reachable", async ({ page }) => {
  await page.goto("/signup");

  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.locator("body")).toContainText(/personal account|SkulGo/i);
});
