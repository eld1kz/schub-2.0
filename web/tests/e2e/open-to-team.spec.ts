import { expect, test } from "@playwright/test";
import { id, service, signInAs } from "./auth";

// Student 17 (Rin Sandbox) is open to a team with no roles yet; student 12 (Woojin Seedling) looks at people and posts a team
// (not 18: delete-account.spec.ts deletes that account).
// Seeded wanted roles: 04 Designer, 10 Designer and Frontend, 15 Full-stack and Backend. Student 13 isn't open.
const rin = id(17);

test.afterAll(async () => {
  await service().from("profiles").update({ open_to_collaborate: true, wanted_roles: [] }).eq("id", rin);
});

test("switch being open to a team in one tap, pick roles in the intro, and visitors see them", async ({ browser }) => {
  const owner = await browser.newContext();
  const visitor = await browser.newContext();
  await signInAs(owner, 17);
  await signInAs(visitor, 12);
  const page = await owner.newPage();
  const other = await visitor.newPage();

  // One tap turns it off and on again
  await page.goto(`/u/${rin}`);
  const hero = page.locator("header").filter({ has: page.getByRole("heading", { level: 1 }) });
  const toggle = hero.getByRole("button", { name: "Open to a team" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await other.goto(`/u/${rin}`);
  await expect(other.locator("main header").getByText("Open to a team", { exact: true })).toHaveCount(0);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(hero.getByText("pick the roles you'd join as")).toBeVisible();

  // Roles are picked in the intro dialog
  await page.getByRole("button", { name: "Edit intro" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit intro" });
  await dialog.getByText("Designer", { exact: true }).click();
  await dialog.getByText("Frontend", { exact: true }).click();
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(hero.getByText("Frontend, Designer")).toBeVisible();

  // Visitors see the roles and the green ring (read out as "Open to a team" on the photo)
  await other.reload();
  const visitorHero = other.locator("main header");
  await expect(visitorHero.getByText("Open to:")).toBeVisible();
  await expect(visitorHero.getByText("Frontend, Designer")).toBeVisible();
  await expect(visitorHero.locator(".ring-open")).toHaveCount(1);

  await owner.close();
  await visitor.close();
});

test("Discover filters people open to a team, and by the role they want", async ({ context, page }) => {
  await signInAs(context, 12);
  await page.goto("/people");
  const names = page.getByRole("main").getByRole("article").getByRole("link", { name: /\w/ });

  await page.getByRole("link", { name: "Open to a team" }).click();
  await expect(page).toHaveURL(/open=1/);
  await expect(names.filter({ hasText: "Eunbi Notreal" })).toHaveCount(0);
  await expect(names.filter({ hasText: "Jisoo Sampleton" })).toHaveCount(1);

  await page.getByLabel("Role they're open to").selectOption("Designer");
  await expect(page).toHaveURL(/role=Designer/);
  await expect(names.filter({ hasText: "Seoyeon Mockford" })).toHaveCount(1);
  await expect(names.filter({ hasText: "Minho Ipsum" })).toHaveCount(1);
  await expect(names.filter({ hasText: "Jisoo Sampleton" })).toHaveCount(0);
  await expect(page.getByText("Open to: Designer, Frontend")).toBeVisible();

  await page.getByRole("link", { name: "Clear filters" }).first().click();
  await expect(page).toHaveURL(/\/people$/);
});

test("a new team picks its open roles from the list, with a note", async ({ context, page }) => {
  await signInAs(context, 12);
  await page.goto("/teams/new");
  await page.getByLabel("What are you building?").fill("E2E Role Picker Team");
  // No role picked yet: the browser keeps the form here, with what was typed
  await page.getByRole("button", { name: "Post team" }).click();
  await expect(page).toHaveURL(/\/teams\/new$/);
  await expect(page.getByLabel("What are you building?")).toHaveValue("E2E Role Picker Team");
  await page.getByRole("button", { name: "Designer", exact: true }).click();
  await page.getByRole("button", { name: "Backend", exact: true }).click();
  await page.getByLabel("Note for Designer").fill("Figma, mobile first");
  await page.getByRole("button", { name: "Post team" }).click();
  await expect(page).toHaveURL(/\/teams\/[0-9a-f-]{36}$/);

  const roles = page.locator("section").filter({ has: page.getByRole("heading", { name: /Open roles/ }) });
  await expect(roles.getByText("Designer", { exact: true })).toBeVisible();
  await expect(roles.getByText("Figma, mobile first")).toBeVisible();
  await expect(roles.getByText("Backend", { exact: true })).toBeVisible();

  const teamId = page.url().split("/").pop() ?? "";
  const { data } = await service().from("teams").select("roles, role_notes").eq("id", teamId).single();
  expect(data).toEqual({ roles: ["Designer", "Backend"], role_notes: { Designer: "Figma, mobile first" } });
  await service().from("teams").delete().eq("id", teamId);
});
