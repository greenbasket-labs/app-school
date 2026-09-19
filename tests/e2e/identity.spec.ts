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


import { test, expect } from "@playwright/test";

function uniqueEmail() {
  return `owner-account-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
}

test("school owner sees their personal account and can open the owner dashboard", async ({ page }) => {
  const email = uniqueEmail();
  const password = "E2E-Strong-Password-123";
  const organizationName = `E2E Account Organization ${Date.now()}`;
  const schoolName = `E2E Account School ${Date.now()}`;
  const cacNumber = `E2E-ACCOUNT-${Date.now()}`;

  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Register your school" })).toBeVisible();
  await page.getByLabel("Organization / registered business name").fill(organizationName);
  await page.getByLabel("School name").fill(schoolName);
  await page.getByLabel("CAC registration number").fill(cacNumber);
  await page.getByLabel("Owner email").fill(email);
  await page.getByLabel("Password (minimum 12 characters)").fill(password);
  await page.getByRole("button", { name: "Create school" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Your schools" })).toBeVisible();
  await expect(page.getByText(schoolName, { exact: true })).toBeVisible();
  await expect(page.getByText("Owner", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Open school →" }).click();
  await expect(page).toHaveURL(/\/app\/schools\/[^/]+\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Operational dashboard" })).toBeVisible();
  await expect(page.getByText(schoolName, { exact: true })).toBeVisible();
});