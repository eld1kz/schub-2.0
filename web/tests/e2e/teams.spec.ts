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
