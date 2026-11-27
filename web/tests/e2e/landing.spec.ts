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
  const main = page.getByRole("main");

  // The hero preview: sample data, labelled as such, and not interactive
  const preview = main.locator("figure");
  for (const role of ["iOS developer", "Designer"]) await expect(preview.getByRole("listitem").filter({ hasText: `${role}, open` })).toBeVisible();
  await expect(preview).toContainText("Confirmed by teammates");
  await expect(preview).toContainText("Preview with sample data, not real people");
  await expect(main.locator("[data-sample]").first()).toBeVisible();
  await expect(main.locator("[data-sample]:not([inert])")).toHaveCount(0);

  // Two paths, each with one way in
  const how = main.getByRole("region", { name: "How it works" });
  await expect(how.getByRole("heading", { level: 3 })).toHaveText(["Looking for a team", "Building a team"]);
  await expect(how.getByRole("link", { name: "Browse teams" })).toHaveAttribute("href", "/teams");
  await expect(how.getByRole("link", { name: "Post a team" })).toHaveAttribute("href", "/login?next=%2Fteams%2Fnew");

  await expect(main.getByRole("region", { name: "What makes Schub different" }).getByRole("heading", { level: 3 })).toHaveText([
    "Teams by event",
    "Awards your teammates confirm",
    "Matched on what you don't have",
  ]);

  // Live from Schub: up to 3 soonest upcoming opportunities, past and removed ones never
  const live = main.getByRole("region", { name: "Live from Schub" });
  const opportunities = live.getByRole("region", { name: "Soonest opportunities" });
  await expect(opportunities.getByRole("article").first()).toBeVisible();
  expect(await opportunities.getByRole("article").count()).toBeLessThanOrEqual(3);
  await expect(live.getByText("Mock AI Challenge Winter")).toBeVisible();
  await expect(main.getByText("Placeholder Hack 2025")).toBeHidden();
  await expect(main.getByText("Removed Sample Event")).toBeHidden();

  // Up to 3 teams, only ones with an open role. The seed has more than one, so teams come first and nothing asks for one.
  const teams = live.getByRole("region", { name: "Teams with open roles" });
  await expect(teams.getByRole("article").first()).toBeVisible();
  expect(await teams.getByRole("article").count()).toBeLessThanOrEqual(3);
  await expect(main.getByText("Full Sample Team")).toBeHidden();
  expect((await teams.boundingBox())!.y).toBeLessThan((await opportunities.boundingBox())!.y);
  await expect(live.getByText(/post a team for/i)).toHaveCount(0);

  // Universities that real profiles list
  const students = main.getByRole("region", { name: "Built for students" });
  await expect(students).toContainText("KAIST");
  await expect(students).toContainText("Korea University");

  await expect(main.getByRole("region", { name: "Questions" }).locator("dt")).toHaveText([
    "Is it free?",
    "Who can join?",
    "Who sees my contact info?",
    "How do awards get confirmed?",
  ]);
  await expect(page.getByRole("navigation", { name: "Browse" }).getByRole("link")).toHaveText(["Opportunities", "Teams", "People"]);

  // Rows link to their pages
  await opportunities.getByRole("link", { name: "Mock AI Challenge Winter" }).click();
  await expect(page).toHaveURL(/\/opportunities\/00000000-0000-4000-9000-000000000002$/);

  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in to Schub" })).toBeVisible();
});

test("phones never scroll sideways", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("members skip the landing page", async ({ context, page }) => {
  await signInAs(context, 1);
  await page.goto("/");
  await expect(page).toHaveURL(/\/opportunities$/);
});

test("signing out goes to /login with the method used last marked", async ({ context, page }) => {
  await signInAs(context, 5);
  await context.addCookies([{ name: "last_sign_in_method", value: "github", domain: "localhost", path: "/" }]);
  await page.goto("/teams");
  await page.getByLabel("Account menu").click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: /Continue with GitHub/ })).toContainText("Last used");
  await expect(page.getByText("Last used")).toHaveCount(1);
});
