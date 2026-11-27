import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./auth";

// Seed (supabase/seed.local.sql): student 3, Doyun, has two accepted connections, Minji (1) and Seoyeon (4).
// Minji runs Open Placeholder Team and is a member of Testerson Robotics, both for Placeholder Hack Seoul 2027.
const hack = "/opportunities/00000000-0000-4000-9000-000000000001";
const robotics = "/teams/00000000-0000-4000-a000-000000000004";
const teamRow = (page: Page, title: string) => page.getByRole("main").getByRole("article").filter({ has: page.getByRole("heading", { name: title }) });

test("teams and events your connections are on say so; others don't", async ({ context, page }) => {
  await signInAs(context, 3);

  await page.goto("/teams");
  // Minji has an award, so its marker sits right after her name
  await expect(teamRow(page, "Testerson Robotics")).toContainText(/Minji Placeholder( Has an award)?, your connection, \+ 2 others/);
  await expect(teamRow(page, "Open Placeholder Team")).toContainText(/Minji Placeholder( Has an award)?, your connection/);
  // Nobody Doyun knows: led by the owner, no signal
  await expect(teamRow(page, "Mock Team With Pending")).toContainText("Jisoo Sampleton");
  await expect(teamRow(page, "Mock Team With Pending")).not.toContainText("your connection");
  // Doyun looks for a team only on an event whose one team is full, so the two teams with Minji come first
  const rows = page.getByRole("main").getByRole("article");
  await expect(rows.nth(0)).toContainText("your connection");
  await expect(rows.nth(1)).toContainText("your connection");
  await expect(rows.nth(2)).not.toContainText("your connection");

  await page.goto("/opportunities");
  const going = page.getByRole("article").filter({ hasText: "Placeholder Hack Seoul 2027" }).getByRole("link", { name: "1 of your connections is going" });
  await expect(going).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: "Mock AI Challenge Winter" })).not.toContainText("of your connections");
  // It goes to the teams on the opportunity page, whose header says the same
  await going.click();
  await expect(page).toHaveURL(`${hack}#teams`);
  await expect(page.getByRole("main").getByRole("link", { name: "1 of your connections is going" })).toHaveAttribute("href", "#teams");
  await expect(teamRow(page, "Testerson Robotics")).toContainText("your connection");
  // On the event's own page the rows don't repeat its name
  await expect(teamRow(page, "Testerson Robotics")).not.toContainText("Placeholder Hack Seoul 2027");

  // The team page marks Minji among the members, and only her
  await page.goto(robotics);
  const member = (name: string) => page.getByRole("region", { name: "Team", exact: true }).getByRole("listitem").filter({ hasText: name });
  await expect(member("Minji Placeholder")).toContainText("Your connection");
  await expect(member("Kai Testerson")).not.toContainText("Your connection");
});

test("signed-out visitors never see the connection signal", async ({ page }) => {
  for (const path of ["/", "/teams", "/opportunities", hack, robotics]) {
    await page.goto(path);
    // Rows are articles; the team page has its slots instead
    await expect(page.getByRole("main").getByRole("article").or(page.getByRole("region", { name: "Team", exact: true })).first()).toBeVisible();
    // The signals themselves; the Find teams intro may still mention connections in general,
    // and the landing page's sample previews show a made-up one
    const signal = /^(your connection|Your connection|\d+ of your connections (is|are) going)$/;
    const inSamples = await page.locator("[data-sample]").getByText(signal).count();
    await expect(page.getByText(signal), path).toHaveCount(inSamples);
  }
});
