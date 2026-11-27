import { expect, test } from "@playwright/test";
import { id, service, signInAs, signUpNew } from "./auth";
import { pick } from "./combobox";

// Seeded work styles: 07 Russian and English, in person; 08 Russian, remote; 15 English and Uzbek, remote.
// Student 12 (Woojin) looks around and posts a team (not 18: delete-account.spec.ts deletes that account);
// student 19 (Nari) edits their own profile.
const nari = id(19);

test.afterAll(async () => {
  await service().from("profiles").update({ languages: [], hours_per_week: "", work_mode: "", city: "" }).eq("id", nari);
});

test("languages, hours, work mode and city are edited in the intro and shown in the hero", async ({ context, page }) => {
  await signInAs(context, 19);
  await page.goto(`/u/${nari}`);
  await page.getByRole("button", { name: "Edit intro" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit intro" });
  await dialog.getByText("Korean", { exact: true }).click();
  await dialog.getByText("English", { exact: true }).click();
  await pick(dialog.getByRole("combobox", { name: "Hours a week", exact: true }), "5-10");
  await pick(dialog.getByRole("combobox", { name: "Work mode", exact: true }), "Remote");
  await expect(dialog.getByLabel("City")).toHaveAttribute("placeholder", "Seoul");
  await dialog.getByLabel("City").fill("Incheon");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("main header").getByText("Korean, English · 5-10 h/week · Remote · Incheon")).toBeVisible();
});

test("onboarding asks for the languages you work in, optionally", async ({ context, page }) => {
  const userId = await signUpNew(context, "Polyglot Testcase");
  await page.goto("/onboarding");
  await page.getByLabel("University").fill("KAIST");
  await page.getByText("Mongolian", { exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByPlaceholder("Search skills").fill("Go");
  await page.getByRole("button", { name: "Go", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page).toHaveURL(/\/opportunities$/);
  const { data } = await service().from("profiles").select("languages").eq("id", userId).single();
  expect(data?.languages).toEqual(["Mongolian"]);
  await service().auth.admin.deleteUser(userId);
});

test("Discover filters by language and work mode; Either counts for both", async ({ context, page }) => {
  await signInAs(context, 12);
  const names = page.getByRole("main").getByRole("article").getByRole("link", { name: /\w/ });

  await page.goto("/people");
  await pick(page.getByLabel("Language", { exact: true }), "Russian");
  await expect(page).toHaveURL(/lang=Russian/);
  await expect(names.filter({ hasText: "Yuna Fixture" })).toHaveCount(1);
  await expect(names.filter({ hasText: "Taeho Stubbs" })).toHaveCount(1);
  await expect(names.filter({ hasText: "Minji Placeholder" })).toHaveCount(0);

  await pick(page.getByLabel("Work mode", { exact: true }), "Remote");
  await expect(page).toHaveURL(/mode=Remote/);
  await expect(names.filter({ hasText: "Taeho Stubbs" })).toHaveCount(1);
  await expect(names.filter({ hasText: "Yuna Fixture" })).toHaveCount(0);
  await expect(page.getByText("Russian · Remote")).toBeVisible();

  // Minji works in person or remotely, so she shows up for either
  await page.goto("/people?lang=Korean&mode=In%20person");
  await expect(names.filter({ hasText: "Minji Placeholder" })).toHaveCount(1);
  await expect(names.filter({ hasText: "Jisoo Sampleton" })).toHaveCount(1);
  await expect(names.filter({ hasText: "Doyun Testwell" })).toHaveCount(0);
});

test("a team sets its language and work mode; they show on its page and rows, and Find teams filters by them", async ({ context, page }) => {
  await signInAs(context, 12);
  await page.goto("/teams/new");
  await page.getByLabel("What are you building?").fill("E2E Mongolian Remote Team");
  await page.getByRole("button", { name: "Backend", exact: true }).click();
  await page.getByText("Mongolian", { exact: true }).click();
  await pick(page.getByRole("combobox", { name: /^How you'll work/ }), "Remote");
  await page.getByRole("button", { name: "Post team" }).click();
  await expect(page).toHaveURL(/\/teams\/[0-9a-f-]{36}$/);
  const teamId = page.url().split("/").pop() ?? "";
  const header = page.locator("main header");
  await expect(header.getByText("Team language:")).toBeVisible();
  await expect(header.getByText("Mongolian", { exact: true })).toBeVisible();
  await expect(header.getByText("Work mode:")).toBeVisible();

  // Someone else finds it by language and work mode
  const other = await context.browser()?.newContext();
  if (!other) throw new Error("No browser");
  await signInAs(other, 17);
  const finder = await other.newPage();
  await finder.goto("/teams?lang=Mongolian&mode=Remote");
  await expect(finder.getByRole("link", { name: "E2E Mongolian Remote Team" })).toBeVisible();
  await expect(finder.getByText("Mongolian · Remote")).toBeVisible();
  await expect(finder.getByRole("link", { name: "Open Placeholder Team" })).toHaveCount(0);
  await finder.goto("/teams?lang=Mongolian&mode=In%20person");
  await expect(finder.getByRole("link", { name: "E2E Mongolian Remote Team" })).toHaveCount(0);
  await other.close();

  await service().from("teams").delete().eq("id", teamId);
});
