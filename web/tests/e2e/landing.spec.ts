import { expect, test } from "@playwright/test";
import { signInAs } from "./auth";

test("signed-out visitors get the landing page with live data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Find teammates for hackathons and projects." })).toBeVisible();
  // Sign-in options in the hero and again at the end; AUTH_PROVIDERS in .env.test.local turns on Google, GitHub and email
  await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Continue with GitHub" })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Send sign-in link" })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Continue with Kakao" })).toHaveCount(0);

  // Live from Schub: up to 3 soonest upcoming opportunities, past and removed ones never
  const main = page.getByRole("main");
  const opportunities = main.locator('a[href^="/opportunities/"]').filter({ has: page.locator("span.font-mono") });
  await expect(opportunities.first()).toBeVisible();
  expect(await opportunities.count()).toBeLessThanOrEqual(3);
  await expect(main.getByText("Mock AI Challenge Winter")).toBeVisible();
  await expect(main.getByText("Placeholder Hack 2025")).toBeHidden();
  await expect(main.getByText("Removed Sample Event")).toBeHidden();

  // Up to 3 teams, only ones with an open role
  const teams = main.getByRole("article").filter({ has: page.locator('a[href^="/teams/"]') });
  await expect(teams.first()).toBeVisible();
  expect(await teams.count()).toBeLessThanOrEqual(3);
  await expect(main.getByText("Full Sample Team")).toBeHidden();

  await expect(main.getByText("Build your profile")).toBeVisible();
  await expect(main.getByText("Find a team or post one")).toBeVisible();
  await expect(main.getByText("Win together")).toBeVisible();
  await expect(main.getByText("Alex Sample")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Browse" }).getByRole("link")).toHaveText(["Opportunities", "Teams", "People"]);

  // Rows link to their pages
  await main.getByRole("link", { name: /Mock AI Challenge Winter/ }).click();
  await expect(page).toHaveURL(/\/opportunities\/00000000-0000-4000-9000-000000000002$/);

  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in to Schub" })).toBeVisible();
});

test("members skip the landing page", async ({ context, page }) => {
  await signInAs(context, 1);
  await page.goto("/");
  await expect(page).toHaveURL(/\/opportunities$/);
});
