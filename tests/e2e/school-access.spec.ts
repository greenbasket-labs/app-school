import { test, expect } from "@playwright/test";

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

test("school owner can approve a join request and activate membership", async ({ browser }) => {
  const suffix = uniqueSuffix();
  const ownerEmail = `owner-${suffix}@example.test`;
  const applicantEmail = `applicant-${suffix}@example.test`;
  const password = "E2E-Strong-Password-123";
  const organizationName = `E2E Organization ${suffix}`;
  const schoolName = `E2E School ${suffix}`;
  const cacNumber = `E2E-CAC-${suffix}`;

  const ownerContext = await browser.newContext();
  const applicantContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const applicant = await applicantContext.newPage();

  try {
    await owner.goto("/register");
    await expect(owner.getByRole("heading", { name: "Register your school" })).toBeVisible();
    await owner.getByLabel("Organization / registered business name").fill(organizationName);
    await owner.getByLabel("School name").fill(schoolName);
    await owner.getByLabel("CAC registration number").fill(cacNumber);
    await owner.getByLabel("Owner email").fill(ownerEmail);
    await owner.getByLabel("Password (minimum 12 characters)").fill(password);
    await owner.getByRole("button", { name: "Create school" }).click();
    await expect(owner).toHaveURL(/\/login$/);

    await owner.getByLabel("Email").fill(ownerEmail);
    await owner.getByLabel("Password").fill(password);
    await owner.getByRole("button", { name: "Sign in" }).click();
    await expect(owner).toHaveURL(/\/app\/schools\/[^/]+$/);
    await expect(owner.getByRole("heading", { name: schoolName })).toBeVisible();

    await applicant.goto("/signup");
    await applicant.getByLabel("Email").fill(applicantEmail);
    await applicant.getByLabel("Password", { exact: true }).fill(password);
    await applicant.getByLabel("Confirm password").fill(password);
    await applicant.getByRole("button", { name: "Create SkulGo account" }).click();
    await expect(applicant).toHaveURL(/\/login\?registered=1&email=/);

    await applicant.getByLabel("Password").fill(password);
    await applicant.getByRole("button", { name: "Sign in" }).click();
    await expect(applicant).toHaveURL(/\/app$/);
    await applicant.getByRole("link", { name: /Find a school/ }).click();
    await expect(applicant).toHaveURL(/\/app\/schools\/join$/);

    await applicant.getByLabel("School name").fill(schoolName);
    await applicant.getByRole("button", { name: "Search" }).click();
    await expect(applicant.getByText(schoolName, { exact: true })).toBeVisible();
    await applicant.getByRole("button", { name: "Request to join" }).click();
    await expect(applicant.getByRole("heading", { name: `Request access to ${schoolName}` })).toBeVisible();
    await applicant.getByLabel("Requested relationship").selectOption("STAFF");
    await applicant.getByRole("button", { name: "Send request" }).click();
    await expect(applicant.getByText("staff · pending", { exact: true })).toBeVisible();

    await owner.getByRole("link", { name: /Settings & modules/ }).click();
    await expect(owner).toHaveURL(/\/settings$/);
    await expect(owner.getByRole("heading", { name: `${schoolName} settings` })).toBeVisible();
    await expect(owner.getByText("Pending join requests", { exact: true })).toBeVisible();
    await expect(owner.getByText(applicantEmail, { exact: true })).toBeVisible();

    await owner.getByRole("button", { name: "Approve & activate" }).click();
    await expect(owner.getByRole("status")).toContainText("Join request approved and school access activated.");
    await expect(owner.getByText("No pending join requests.", { exact: true })).toBeVisible();

    await applicant.goto("/app");
    await expect(applicant).toHaveURL(/\/app\/schools\/[^/]+$/);
    await expect(applicant.getByRole("heading", { name: schoolName })).toBeVisible();
  } finally {
    await ownerContext.close();
    await applicantContext.close();
  }
});
