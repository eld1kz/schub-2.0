import { expect, test, type Page } from "@playwright/test";
import { id, service, signInAs } from "./auth";

// Student 14 (Kai) adds the award and tags 15 (Dana), an accepted connection
async function confirmTag(page: Page, placement: string) {
  await page.goto(`/u/${id(15)}`);
  const waiting = page.getByRole("region", { name: "Awards to confirm" });
  await expect(waiting).toContainText(`tagged you in ${placement}, E2E Robot Cup`);
  await waiting.getByRole("button", { name: "Confirm" }).click();
  await expect(waiting).toBeHidden();
}

// Starts from no "E2E Robot Cup" award, so the test can run again on the same database
test.beforeEach(async () => {
  await service().from("awards").delete().eq("user_id", id(14)).eq("event_name", "E2E Robot Cup");
});

test("add an award, tag a teammate, confirm; changing the placement asks again", async ({ browser }) => {
  const owner = await browser.newContext();
  const teammate = await browser.newContext();
  await signInAs(owner, 14);
  await signInAs(teammate, 15);
  const ownerPage = await owner.newPage();
  const teammatePage = await teammate.newPage();

  // Add
  await ownerPage.goto(`/u/${id(14)}`);
  await ownerPage.getByRole("button", { name: "+ Add award" }).click();
  const dialog = ownerPage.getByRole("dialog", { name: "Add award" });
  await dialog.getByPlaceholder("Search opportunities on Schub").fill("E2E Robot Cup");
  await dialog.getByRole("button", { name: "Use “E2E Robot Cup” as event name" }).click();
  await dialog.locator("#award-placement").selectOption("Finalist");
  await dialog.getByLabel("Month", { exact: true }).selectOption("03");
  await dialog.getByLabel("Year", { exact: true }).selectOption("2026");
  await dialog.getByPlaceholder("Search your connections and teammates").fill("Dana Mock");
  await dialog.getByRole("button", { name: /Dana Mockingbird/ }).click();
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(ownerPage.getByRole("heading", { name: "E2E Robot Cup" })).toBeVisible();

  // The teammate confirms
  await confirmTag(teammatePage, "Finalist");
  await expect(teammatePage.getByRole("heading", { name: "E2E Robot Cup" })).toBeVisible();

  // The owner changes the placement...
  await ownerPage.reload();
  await ownerPage.getByRole("button", { name: "Edit Finalist, E2E Robot Cup" }).click();
  const edit = ownerPage.getByRole("dialog", { name: "Edit award" });
  await edit.locator("#award-placement").selectOption("Winner");
  await edit.getByRole("button", { name: "Save", exact: true }).click();
  await expect(edit).toBeHidden();

  // ...so the teammate has to confirm again
  await confirmTag(teammatePage, "Winner");

  await owner.close();
  await teammate.close();
});
