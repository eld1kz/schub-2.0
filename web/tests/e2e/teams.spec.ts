import { expect, test } from "@playwright/test";
import { id, signInAs } from "./auth";

// Student 11 (Sora) posts the team; student 12 (Woojin) applies. They aren't connected.
test("post a team, apply from a second user, accept, and contact details appear", async ({ browser }) => {
  const owner = await browser.newContext();
  const applicant = await browser.newContext();
  await signInAs(owner, 11);
  await signInAs(applicant, 12);
  const ownerPage = await owner.newPage();
  const applicantPage = await applicant.newPage();

  // Post
  await ownerPage.goto("/teams/new");
  await ownerPage.getByLabel("What are you building?").fill("E2E Rocket Team");
  await ownerPage.getByRole("button", { name: "Frontend", exact: true }).click();
  await ownerPage.getByRole("button", { name: "Post team" }).click();
  await expect(ownerPage).toHaveURL(/\/teams\/[0-9a-f-]{36}$/);
  const teamUrl = ownerPage.url();

  // Before anything is accepted, neither sees the other's contact
  await applicantPage.goto(`/u/${id(11)}`);
  await expect(applicantPage.getByText("t.me/fake_student_11")).toBeHidden();

  // Apply
  await applicantPage.goto(teamUrl);
  await applicantPage.getByRole("button", { name: "Apply for this role" }).click();
  const dialog = applicantPage.getByRole("dialog", { name: "Apply for Frontend" });
  await dialog.getByLabel(/Why you/).fill("I write React every day.");
  await dialog.getByRole("button", { name: "Send application" }).click();
  await expect(applicantPage.getByText("You applied")).toBeVisible();

  // Accept
  await ownerPage.goto(teamUrl);
  await ownerPage.getByRole("button", { name: "Accept" }).click();
  await expect(ownerPage.getByText("All roles are filled.")).toBeVisible();

  // Now each sees the other's contact details
  await applicantPage.goto(`/u/${id(11)}`);
  await expect(applicantPage.getByRole("link", { name: "t.me/fake_student_11" })).toBeVisible();
  await ownerPage.goto(`/u/${id(12)}`);
  await expect(ownerPage.getByRole("link", { name: "t.me/fake_student_12" })).toBeVisible();

  await owner.close();
  await applicant.close();
});

// Student 13 posts a team, then edits it from its page
test("the owner edits the team", async ({ browser }) => {
  const context = await browser.newContext();
  await signInAs(context, 13);
  const page = await context.newPage();
  await page.goto("/teams/new");
  await page.getByLabel("What are you building?").fill("E2E Editable Team");
  await page.getByRole("button", { name: "Frontend", exact: true }).click();
  await page.getByRole("button", { name: "Post team" }).click();
  await expect(page).toHaveURL(/\/teams\/[0-9a-f-]{36}$/);

  await page.getByRole("button", { name: "Edit team" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit team" });
  await dialog.getByLabel("What are you building?").fill("E2E Edited Team");
  await dialog.getByRole("button", { name: "Frontend", exact: true }).click();
  await dialog.getByRole("button", { name: "Designer", exact: true }).click();
  await dialog.getByLabel("Note for Designer").fill("Figma");
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("heading", { name: "E2E Edited Team" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Designer" })).toContainText("Figma");
  await expect(page.getByRole("group", { name: "Frontend" })).toBeHidden();
  await context.close();
});

// Team 4 "Testerson Robotics": owner 14, members 16 and 01
test("the team page shows each member once, with contact details only to those allowed", async ({ context, page }) => {
  const team = "00000000-0000-4000-a000-000000000004";
  const members = page.getByRole("region", { name: "Team", exact: true });
  const contact = members.getByRole("link", { name: "t.me/fake_student_14" });

  await page.goto(`/teams/${team}`);
  await expect(members.getByRole("listitem").filter({ hasText: "Lead" })).toContainText("Kai Testerson");
  await expect(contact).toHaveCount(0);

  await signInAs(context, 1);
  await page.reload();
  await expect(contact).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /Kai Testerson/ })).toHaveCount(1);
  await expect(page.getByText("Started by")).toHaveCount(0);
});
