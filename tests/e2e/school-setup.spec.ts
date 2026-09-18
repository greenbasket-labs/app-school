import { test, expect } from "@playwright/test";

function suffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

test("school owner can complete academic foundation and enroll a student", async ({ page }) => {
  const s = suffix();
  const email = `setup-${s}@example.test`;
  const password = "E2E-Strong-Password-123";
  const school = `Setup School ${s}`;

  await page.goto("/register");
  await page.getByLabel("Organization / registered business name").fill(`Setup Organization ${s}`);
  await page.getByLabel("School name").fill(school);
  await page.getByLabel("CAC registration number").fill(`SETUP-CAC-${s}`);
  await page.getByLabel("Owner email").fill(email);
  await page.getByLabel("Password (minimum 12 characters)").fill(password);
  await page.getByRole("button", { name: "Create school" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app\/schools\/[^/]+$/);
  await page.getByRole("link", { name: /School setup/ }).click();
  await expect(page.getByText("0 of 6 foundation checks complete.", { exact: true })).toBeVisible();

  const session = page.getByRole("heading", { name: "1. Academic session" }).locator("..");
  await session.getByLabel("Name").fill("2026/2027");
  await session.getByLabel("Starts").fill("2026-09-01");
  await session.getByLabel("Ends").fill("2027-07-31");
  await session.getByRole("button", { name: "Create session" }).click();
  await expect(page.getByText("Academic session created.", { exact: true })).toBeVisible();

  const term = page.getByRole("heading", { name: "2. Academic terms" }).locator("..");
  await term.getByLabel("Term name").fill("First Term");
  await term.getByLabel("Order").fill("1");
  await term.getByLabel("Starts").fill("2026-09-01");
  await term.getByLabel("Ends").fill("2026-12-18");
  await term.getByRole("button", { name: "Create term" }).click();
  await expect(page.getByText("Academic term created.", { exact: true })).toBeVisible();

  const level = page.getByRole("heading", { name: "3. Class levels" }).locator("..");
  await level.getByLabel("Name").fill("JSS 1");
  await level.getByLabel("Order").fill("1");
  await level.getByRole("button", { name: "Create class level" }).click();
  await expect(page.getByText("Class level created.", { exact: true })).toBeVisible();

  const arm = page.getByRole("heading", { name: "4. Class arms" }).locator("..");
  await arm.getByLabel("Class level").selectOption({ label: "JSS 1" });
  await arm.getByLabel("Arm name").fill("A");
  await arm.getByRole("button", { name: "Create arm" }).click();
  await expect(page.getByText("Class arm created.", { exact: true })).toBeVisible();

  const subject = page.getByRole("heading", { name: "5. Subjects" }).locator("..");
  await subject.getByLabel("Subject name").fill("Mathematics");
  await subject.getByLabel("Code (optional)").fill("MTH");
  await subject.getByRole("button", { name: "Create subject" }).click();
  await expect(page.getByText("Subject created.", { exact: true })).toBeVisible();

  const assignment = page.getByRole("heading", { name: "6. Assign subjects to classes" }).locator("..");
  await assignment.getByLabel("Academic session").selectOption({ label: "2026/2027" });
  await assignment.getByLabel("Class arm").selectOption({ label: "JSS 1 A" });
  await assignment.getByLabel("Subject").selectOption({ label: "Mathematics" });
  await assignment.getByRole("button", { name: "Assign subject" }).click();
  await expect(page.getByText("Subject assigned to class.", { exact: true })).toBeVisible();

  await expect(page.getByText("6 of 6 foundation checks complete.", { exact: true })).toBeVisible();
  await expect(page.getByText("READY", { exact: true })).toBeVisible();

  const studentsUrl = (await page.url()).replace(/\/setup$/, "/students");
  await page.goto(studentsUrl);
  await expect(page.getByRole("heading", { name: school })).toBeVisible();
  await page.getByRole("button", { name: "+ Add student" }).click();
  await page.getByPlaceholder("Admission number").fill("ADM-001");
  await page.getByPlaceholder("First name").fill("Aisha");
  await page.getByPlaceholder("Last name").fill("Bello");
  await page.getByRole("button", { name: "Create student" }).click();
  await expect(page.getByRole("status")).toHaveText("Student record created.");
  await expect(page.getByText("Aisha Bello", { exact: true })).toBeVisible();

  const enrollment = page.getByRole("form").filter({ hasText: "Enroll student" });
  await enrollment.getByRole("combobox").nth(0).selectOption({ label: "Aisha Bello — ADM-001" });
  await enrollment.getByRole("combobox").nth(1).selectOption({ label: "2026/2027 (Active)" });
  await enrollment.getByRole("combobox").nth(2).selectOption({ label: "JSS 1 — A" });
  await enrollment.getByRole("button", { name: "Enroll" }).click();
  await expect(page.getByRole("status")).toHaveText("Student enrolled successfully.");
  await expect(page.getByText("JSS 1 — A", { exact: true })).toBeVisible();
  await expect(page.getByText("2026/2027", { exact: true })).toBeVisible();
});
