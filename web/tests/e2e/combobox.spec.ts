import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./auth";
import { open, option, pick } from "./combobox";

// The design system's dropdown (src/components/ui/combobox.tsx) and the country list it shows on /opportunities.
// Upcoming events in the seed are in Korea, Japan and the United States, plus two online; none are in France.
const country = (page: Page) => page.getByRole("combobox", { name: "Country", exact: true });
const search = (page: Page) => page.getByRole("combobox", { name: "Search Country" });
const options = (page: Page) => page.getByRole("listbox", { name: "Country options" }).getByRole("option");
const events = (page: Page) => page.getByRole("article");
// The highlighted option's text, found the way a screen reader finds it
async function highlighted(page: Page) {
  const active = await search(page).getAttribute("aria-activedescendant");
  return page.locator(`[id="${active}"]`);
}

test("country list: online and Korea first, then countries with events and counts, then the rest by name", async ({ page }) => {
  await page.goto("/opportunities");
  await open(country(page));
  await expect(options(page).nth(0)).toHaveText("Any country");
  await expect(options(page).nth(1)).toHaveText("Online / worldwide2");
  await expect(options(page).nth(2)).toHaveText("South Korea1");
  await expect(options(page).nth(3)).toHaveText("Japan1");
  await expect(options(page).nth(4)).toHaveText("United States1");
  const others = page.getByRole("group", { name: "Other countries" }).getByRole("option");
  const names = await others.allInnerTexts();
  expect(names.length).toBeGreaterThan(200);
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  expect(names).not.toContain("Japan");
});

test("searching and picking a country with the keyboard", async ({ page }) => {
  await page.goto("/opportunities");
  // Opening and closing by keyboard changes nothing
  await expect(async () => {
    await country(page).press("ArrowDown");
    await expect(search(page)).toBeFocused({ timeout: 1000 });
  }).toPass();
  await expect(await highlighted(page)).toHaveText("Any country");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(await highlighted(page)).toHaveText("South Korea1");
  await page.keyboard.press("ArrowUp");
  await expect(await highlighted(page)).toHaveText("Online / worldwide2");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(country(page)).toBeFocused();
  await expect(page).toHaveURL(/\/opportunities$/);

  // Typing on the closed button opens it, already searching
  await page.keyboard.press("j");
  await expect(search(page)).toHaveValue("j");
  await search(page).pressSequentially("ap");
  await expect(options(page)).toHaveText(["Japan1"]);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/country=JP$/);
  await expect(country(page)).toBeFocused();
  await expect(country(page)).toHaveText("Japan");
  await expect(events(page)).toHaveCount(1);

  // Opening again highlights the picked one, which has the check mark
  await page.keyboard.press("Enter");
  await expect(await highlighted(page)).toHaveText("Japan1");
  await expect(option(page, "Japan")).toHaveAttribute("aria-selected", "true");
  await expect(option(page, "Japan").locator("svg")).toBeVisible();
  await expect(option(page, "South Korea").locator("svg")).toBeHidden();
  await search(page).fill("atlantis");
  await expect(page.getByRole("status").filter({ hasText: "No matches" })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(search(page)).toBeVisible();
  // Tab leaves and closes it
  await page.keyboard.press("Tab");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Language", exact: true })).toBeFocused();
});

test("searching and picking a country with the mouse", async ({ page }) => {
  await page.goto("/opportunities");
  await open(country(page));
  await search(page).fill("united");
  await expect(options(page).first()).toHaveText("United States1");
  await option(page, "United States").click();
  await expect(page).toHaveURL(/country=US$/);
  await expect(country(page)).toHaveText("United States");
  await expect(events(page)).toHaveCount(1);

  // A click outside closes it; so does a second click on the button
  await open(country(page));
  await page.getByRole("heading", { level: 1 }).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await open(country(page));
  await country(page).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(page).toHaveURL(/country=US$/);
});

test("a short list has no search: typing jumps to an option", async ({ page }) => {
  await page.goto("/opportunities");
  const sort = page.getByRole("combobox", { name: "Sort" });
  await open(sort);
  await expect(page.getByRole("combobox", { name: "Search Sort" })).toHaveCount(0);
  await expect(page.getByRole("listbox", { name: "Sort options" })).toBeFocused();
  await page.keyboard.press("m");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/sort=looking$/);
});

test("a country with no events says so and offers to add one", async ({ page }) => {
  await page.goto("/opportunities");
  await pick(country(page), "France");
  await expect(page).toHaveURL(/country=FR$/);
  await expect(page.getByText("No events in France yet")).toBeVisible();
  await expect(page.getByRole("link", { name: "Add one" })).toHaveAttribute("href", "/opportunities/new");

  // A country with events that the other filters leave out isn't "no events yet"
  await page.goto("/opportunities?country=JP&type=grant");
  await expect(page.getByText("No upcoming grants match these filters.")).toBeVisible();
  await expect(page.getByText("No events in")).toHaveCount(0);
});

test("the opportunity form has the same country list, and a required dropdown blocks submitting", async ({ context, page }) => {
  await signInAs(context, 6);
  await page.goto("/opportunities/new");
  // Named by the label above it, which ends "(optional)"
  const field = page.getByRole("combobox", { name: /^Country/ });
  await open(field);
  await expect(options(page).nth(0)).toHaveText("Online / worldwide2");
  await expect(options(page).nth(1)).toHaveText("South Korea1");
  await expect(page.getByRole("group", { name: "Other countries" })).toBeVisible();
  await search(page).fill("france");
  await page.keyboard.press("Enter");
  // Enter picked the country without submitting the form
  await expect(page.locator('input[name="country"]')).toHaveValue("FR");

  await page.getByLabel("Link").fill("https://example.com/combobox-test");
  await page.getByLabel("Title").fill("E2E Combobox Cup");
  const type = page.locator('input[name="type"]');
  await page.getByRole("button", { name: "Add opportunity" }).click();
  expect(await type.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  await expect(page.getByRole("button", { name: "Add opportunity" })).toBeEnabled();
  await expect(page).toHaveURL(/\/opportunities\/new$/);
  await pick(page.getByRole("combobox", { name: "Type", exact: true }), "Hackathon");
  expect(await type.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(true);

  // A half-picked date blocks submitting too, with the form's own message
  const month = page.getByRole("combobox", { name: "Deadline month", exact: true });
  await pick(month, "Mar");
  await page.getByRole("button", { name: "Add opportunity" }).click();
  await expect(page).toHaveURL(/\/opportunities\/new$/);
  const message = await month.evaluate((el) => el.parentElement?.querySelector("input")?.validationMessage);
  expect(message).toBe("Pick the month, day and year, or clear them.");
});

test("Escape in a dropdown inside an edit dialog closes only the list", async ({ context, page }) => {
  await signInAs(context, 19);
  await page.goto("/u/00000000-0000-4000-8000-000000000019");
  await page.getByRole("button", { name: "Edit intro" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit intro" });
  const mode = dialog.getByRole("combobox", { name: "Work mode" });
  await open(mode);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(dialog).toBeVisible();
  // The popup isn't cut off by the dialog's scrolling body
  await open(mode);
  await expect(option(page, "In person or remote")).toBeInViewport({ ratio: 1 });
  await option(page, "In person or remote").click();
  await expect(mode).toHaveText("In person or remote");
  await expect(dialog).toBeVisible();
});

test("/design shows the open list's states, light and dark", async ({ page }) => {
  await page.goto("/design");
  await expect(page.getByRole("listbox", { name: "Example country options" })).toHaveCount(2);
  await expect(page.getByRole("status").filter({ hasText: "No matches" })).toHaveCount(2);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("the list opens as a bottom sheet with search", async ({ page }) => {
    await page.goto("/opportunities");
    await open(country(page));
    const sheet = page.getByRole("dialog", { name: "Pick: Country" });
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();
    expect(box && [Math.round(box.x), Math.round(box.width), Math.round(box.y + box.height)]).toEqual([0, 390, 844]);
    // The keyboard stays down until the search field is tapped
    await expect(search(page)).not.toBeFocused();
    await search(page).tap();
    await search(page).fill("kor");
    await option(page, "South Korea").tap();
    await expect(sheet).toHaveCount(0);
    await expect(page).toHaveURL(/country=KR$/);
    await expect(country(page)).toHaveText("South Korea");

    // Close, Escape and a tap above the sheet leave the choice alone
    await open(country(page));
    await sheet.getByRole("button", { name: "Close" }).tap();
    await expect(sheet).toHaveCount(0);
    await open(country(page));
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await open(country(page));
    await page.mouse.click(195, 20);
    await expect(sheet).toHaveCount(0);
    await expect(page).toHaveURL(/country=KR$/);
  });

  test("a sheet over an edit dialog closes without closing the dialog", async ({ context, page }) => {
    await signInAs(context, 19);
    await page.goto("/u/00000000-0000-4000-8000-000000000019");
    await page.getByRole("button", { name: "Edit intro" }).tap();
    const dialog = page.getByRole("dialog", { name: "Edit intro" });
    const mode = dialog.getByRole("combobox", { name: "Work mode" });
    await open(mode);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Pick: Work mode" })).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await pick(mode, "In person or remote");
    await expect(mode).toHaveText("In person or remote");
    await expect(dialog).toBeVisible();
  });
});
