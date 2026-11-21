import { expect, test } from "@playwright/test";
import { id, service, signInAs } from "./auth";

// Team 2 "Full Sample Team": owner 07 (Yuna), members 08 (Taeho, Backend) and 14 (Kai, ML), for the upcoming
// Mock AI Challenge Winter. Opportunity 4, Placeholder Hack 2025, ended long ago.
const team = "00000000-0000-4000-a000-000000000002";
const upcoming = "00000000-0000-4000-9000-000000000002";
const ended = "00000000-0000-4000-9000-000000000004";
const awardId = "00000000-0000-4000-b000-0000000000e2";

test.afterAll(async () => {
  const db = service();
  await db.from("team_projects").delete().eq("team_id", team);
  await db.from("awards").delete().eq("id", awardId);
  await db.from("teams").update({ opportunity_id: upcoming }).eq("id", team);
});

test("the owner records what the team built after the event; members confirm, it shows with who built it, and edits ask again", async ({ browser }) => {
  const db = service();
  const owner = await browser.newContext();
  const member = await browser.newContext();
  const other = await browser.newContext();
  await signInAs(owner, 7);
  await signInAs(member, 8);
  await signInAs(other, 14);
  const page = await owner.newPage();
  const taeho = await member.newPage();
  const kai = await other.newPage();

  // Before the event is over, there's nothing to record yet
  await page.goto(`/teams/${team}`);
  await expect(page.getByText("Once Mock AI Challenge Winter is over, you can record what the team built here.")).toBeVisible();

  // After it
  await db.from("teams").update({ opportunity_id: ended }).eq("id", team);
  await page.reload();
  await page.getByRole("button", { name: "+ Record what we built" }).click();
  const dialog = page.getByRole("dialog", { name: "Record what we built" });
  await dialog.getByLabel("Name").fill("E2E Climate Bot");
  await dialog.getByLabel("One line about it").fill("Answers climate questions with sources");
  await dialog.getByLabel("Link to it").fill("example.com/climate-bot");
  await dialog.getByLabel("Result (optional)").fill("Finalist");
  await dialog.getByRole("button", { name: "Record", exact: true }).click();
  await expect(dialog).toBeHidden();
  const built = page.locator("#built");
  await expect(built.getByRole("heading", { name: "E2E Climate Bot" })).toBeVisible();
  await expect(built.getByText("Finalist")).toBeVisible();

  // Taeho confirms from his profile; Kai declines
  await taeho.goto(`/u/${id(8)}`);
  const ask = taeho.getByRole("region", { name: "Projects to confirm" });
  await expect(ask.getByText("E2E Climate Bot")).toBeVisible();
  await ask.getByRole("button", { name: "Confirm" }).click();
  await expect(ask).toBeHidden();
  await kai.goto(`/u/${id(14)}`);
  await kai.getByRole("region", { name: "Projects to confirm" }).getByRole("button", { name: "Decline" }).click();

  // On Taeho's profile, for anyone: in Projects with who built it, and in On Schub
  await page.goto(`/u/${id(8)}`);
  const project = page.locator("article", { has: page.getByRole("heading", { name: "E2E Climate Bot" }) });
  await expect(project.getByText("Built with")).toBeVisible();
  await expect(project.getByRole("link", { name: "Full Sample Team" })).toBeVisible();
  await expect(project.getByTitle("Yuna Fixture")).toBeVisible();
  await expect(page.getByText("· Built E2E Climate Bot")).toBeVisible();
  // Kai declined, so it isn't on his
  await page.goto(`/u/${id(14)}`);
  await expect(page.getByRole("heading", { name: "E2E Climate Bot" })).toHaveCount(0);

  // An award for the team shows with the project
  await db.from("awards").insert({ id: awardId, user_id: id(7), placement: "2nd", event_name: "Placeholder Hack 2025", opportunity_id: ended, team_id: team, awarded_on: "2025-05-01" });
  await page.goto(`/teams/${team}`);
  await expect(page.locator("#built").getByText("2nd")).toBeVisible();

  // Changing the result asks Taeho again
  await page.getByRole("button", { name: "Edit what we built" }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit project" });
  await editDialog.getByLabel("Result (optional)").fill("Winner");
  await editDialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editDialog).toBeHidden();
  await taeho.goto(`/u/${id(8)}`);
  await expect(taeho.getByRole("region", { name: "Projects to confirm" }).getByText("E2E Climate Bot")).toBeVisible();
  await taeho.getByRole("region", { name: "Projects to confirm" }).getByRole("button", { name: "Confirm" }).click();

  // Taeho hides it from his profile, and can bring it back
  await taeho.getByRole("button", { name: "Hide from my profile" }).click();
  await expect(taeho.getByText("Hidden from your profile")).toBeVisible();
  await page.goto(`/u/${id(8)}`);
  await expect(page.getByRole("heading", { name: "E2E Climate Bot" })).toHaveCount(0);
  await taeho.getByRole("button", { name: "Show on my profile" }).click();
  await expect(taeho.getByText("Hidden from your profile")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "E2E Climate Bot" })).toBeVisible();

  await owner.close();
  await member.close();
  await other.close();
});
