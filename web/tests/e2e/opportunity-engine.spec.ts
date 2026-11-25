import { expect, test, type Page } from "@playwright/test";
import { id, service, signInAs } from "./auth";

// Filters, sorting, "for you", Review imports and "Fill from link" (supabase/opportunity-engine.sql).
// Upcoming and listed in the seed: "Mock AI Challenge Winter" (online, English, deadline 2026-11-30), "Placeholder Hack
// Seoul 2027" (Seoul, Korean and English, 3 people looking), "Notreal Startup Grant" (online), "Sample Hack Club Jam"
// (Boston, imported), "Tokyo Sample Ideathon" (only people in Japan; the newest). "Sample Luma Builders Night" is an
// import waiting for review. Student 01 is in Seoul and speaks Korean and English; 20 is the admin.
const luma = "00000000-0000-4000-9000-000000000009";
const winter = "Mock AI Challenge Winter";
const seoul = "Placeholder Hack Seoul 2027";
const grant = "Notreal Startup Grant";
const boston = "Sample Hack Club Jam";
const tokyo = "Tokyo Sample Ideathon";
const lumaTitle = "Sample Luma Builders Night";

test.afterAll(async () => {
  const db = service();
  await db.from("opportunities").update({ needs_review: true, reviewed_at: null, status: "live" }).eq("id", luma);
  await db.from("link_fetches").delete().eq("user_id", id(6));
});

const list = (page: Page) => page.getByRole("article");
// The listed titles, top to bottom
const titles = (page: Page) => list(page).getByRole("link").filter({ hasNotText: /going|connection/i }).allInnerTexts();
const country = (page: Page) => page.getByLabel("Country", { exact: true });

test("signed out: every event, each row with its place and languages; imports waiting for review aren't listed", async ({ page }) => {
  await page.goto("/opportunities");
  await expect(list(page).filter({ hasText: tokyo })).toContainText("Tokyo, Japan");
  await expect(list(page).filter({ hasText: tokyo })).toContainText("Japanese");
  await expect(list(page).filter({ hasText: winter })).toContainText("Online");
  await expect(list(page).filter({ hasText: boston })).toContainText("Boston, United States");
  await expect(list(page).filter({ hasText: lumaTitle })).toHaveCount(0);
  await expect(page.getByText("Showing events for you")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Review imports" })).toHaveCount(0);
});

test("each type tab counts the events of that type, with the other filters applied", async ({ page }) => {
  const tabs = (p: Page) => p.getByRole("navigation", { name: "Opportunity types" }).getByRole("link");
  await page.goto("/opportunities");
  await expect(tabs(page)).toHaveText(["All 5", "Hackathons 2", "Competitions 2", "Grants 1", "Internships 0", "Other 0"]);
  // Online only: the AI challenge and the grant
  await page.goto("/opportunities?country=online");
  await expect(tabs(page)).toHaveText(["All 2", "Hackathons 0", "Competitions 1", "Grants 1", "Internships 0", "Other 0"]);
});

test("country, language and Can I join? filter the list and live in the URL", async ({ page }) => {
  await page.goto("/opportunities");
  // Online first, then Korea, then the other countries with events
  const options = await country(page).locator("option").allInnerTexts();
  expect(options.slice(0, 3)).toEqual(["Any country", "Online / worldwide (2)", "South Korea (1)"]);
  expect(options).toContain("Japan (1)");
  expect(options).toContain("United States (1)");

  await country(page).selectOption("JP");
  await expect(page).toHaveURL(/\/opportunities\?country=JP$/);
  await expect.poll(() => titles(page)).toEqual([tokyo]);

  await country(page).selectOption("online");
  await expect(page).toHaveURL(/country=online/);
  await expect.poll(async () => (await titles(page)).sort()).toEqual([winter, grant].sort());

  await page.getByLabel("Language", { exact: true }).selectOption("English");
  await expect(page).toHaveURL(/country=online&lang=English/);
  await expect.poll(() => titles(page)).toEqual([winter]);

  // The URL alone gives the same list
  await page.goto("/opportunities?lang=Japanese");
  await expect.poll(() => titles(page)).toEqual([tokyo]);
  // We don't know where a signed-out visitor is, so a country-only event isn't one they can join
  await page.getByLabel("Can I join?").click();
  await expect(page).toHaveURL(/lang=Japanese&canjoin=1/);
  await expect(page.getByText("No upcoming opportunities match these filters.")).toBeVisible();

  await page.goBack();
  await expect.poll(() => titles(page)).toEqual([tokyo]);
});

test("sorting: deadline soonest by default, then newest, then most people looking", async ({ page }) => {
  await page.goto("/opportunities");
  const before = (list: string[], a: string, b: string) => list.indexOf(a) >= 0 && list.indexOf(a) < list.indexOf(b);

  await expect.poll(async () => before(await titles(page), winter, seoul)).toBe(true);
  await expect.poll(async () => before(await titles(page), seoul, tokyo)).toBe(true);

  await page.getByLabel("Sort").selectOption("newest");
  await expect(page).toHaveURL(/sort=newest/);
  await expect.poll(async () => before(await titles(page), tokyo, winter)).toBe(true);

  await page.getByLabel("Sort").selectOption("looking");
  await expect(page).toHaveURL(/sort=looking/);
  await expect.poll(async () => (await titles(page))[0]).toBe(seoul);
});

test("signed in: events for you by default, with Show all", async ({ browser }) => {
  const context = await browser.newContext();
  await signInAs(context, 1);
  const page = await context.newPage();
  await page.goto("/opportunities");

  await expect(page.getByText("Showing events for you")).toContainText("South Korea or online, in Korean or English");
  await expect(list(page).filter({ hasText: seoul })).toHaveCount(1);
  await expect(list(page).filter({ hasText: winter })).toHaveCount(1);
  // In another country, not online
  await expect(list(page).filter({ hasText: boston })).toHaveCount(0);
  await expect(list(page).filter({ hasText: tokyo })).toHaveCount(0);

  await page.getByRole("link", { name: "Show all" }).click();
  await expect(page).toHaveURL(/all=1/);
  await expect(list(page).filter({ hasText: tokyo })).toHaveCount(1);
  await expect(list(page).filter({ hasText: boston })).toHaveCount(1);

  // Japan only, and you're in Korea
  await page.getByLabel("Can I join?").click();
  await expect(page).toHaveURL(/canjoin=1/);
  await expect(list(page).filter({ hasText: tokyo })).toHaveCount(0);
  await expect(list(page).filter({ hasText: boston })).toHaveCount(1);

  await page.getByRole("link", { name: "Show events for you" }).click();
  await expect(page.getByText("Showing events for you")).toBeVisible();
  await context.close();
});

test("admins review imports: Approve lists it for everyone", async ({ browser, page }) => {
  const context = await browser.newContext();
  await signInAs(context, 20);
  const admin = await context.newPage();
  await admin.goto("/opportunities");
  const review = admin.getByRole("region", { name: "Review imports" });
  const item = review.locator("div").filter({ hasText: lumaTitle }).filter({ has: admin.getByRole("button", { name: "Approve" }) }).last();
  await expect(item).toContainText("Luma");
  await expect(item.getByRole("link", { name: "Edit" })).toHaveAttribute("href", `/opportunities/${luma}/edit`);

  await item.getByRole("button", { name: "Approve" }).click();
  await expect(review).toHaveCount(0);
  await admin.goto("/opportunities?all=1");
  await expect(list(admin).filter({ hasText: lumaTitle })).toHaveCount(1);
  await page.goto("/opportunities");
  await expect(list(page).filter({ hasText: lumaTitle })).toHaveCount(1);
  await context.close();
});

test("Fill from link copies the event page into the form", async ({ browser }) => {
  const context = await browser.newContext();
  await signInAs(context, 6);
  const page = await context.newPage();
  await page.goto("/opportunities/new");
  const fill = page.getByRole("button", { name: "Fill from link" });

  await page.getByLabel("Link").fill("http://localhost:3102/no-event.html");
  await fill.click();
  await expect(page.getByRole("alert").filter({ hasText: "That page doesn't describe an event we can read. Fill the form in yourself." })).toBeVisible();

  await page.getByLabel("Link").fill("http://localhost:3102/event.html");
  await fill.click();
  await expect(page.getByRole("status").filter({ hasText: "Filled from the page. Check every field before adding." })).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue("Busan Sample Hackathon 2027");
  await expect(page.locator("#type")).toHaveValue("hackathon");
  await expect(page.getByLabel("Organizer")).toHaveValue("Sample Club");
  await expect(page.getByLabel("City")).toHaveValue("Busan");
  await expect(page.locator("#country")).toHaveValue("KR");
  await expect(page.getByRole("checkbox", { name: "Korean" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "English" })).toBeChecked();
  await expect(page.locator('input[name="deadline"]')).toHaveValue("2027-03-31");
  await expect(page.locator('input[name="starts_at"]')).toHaveValue("2027-04-10");
  await expect(page.locator('input[name="ends_at"]')).toHaveValue("2027-04-11");
  await expect(page.getByLabel("Description")).toHaveValue("A made-up hackathon page for the end-to-end tests.");
  // The link stays, for the person to check and submit
  await expect(page.getByLabel("Link")).toHaveValue("http://localhost:3102/event.html");
  await context.close();
});
