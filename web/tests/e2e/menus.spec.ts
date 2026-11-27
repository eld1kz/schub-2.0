import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./auth";

// The top bar's menus work as plain HTML before the page's script arrives, and a slow script must not shut one that
// was opened meanwhile. (This made "Sign out" disappear now and then on a slow server.)
async function openBeforeScript(page: Page, label: string | RegExp) {
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/_next/**/*.js*", async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("/opportunities", { waitUntil: "commit" });
  await page.getByLabel(label).click();
  release();
  // React has taken over once it has put its own keys on the element
  await page.waitForFunction(() => [...document.querySelectorAll("details")].every((d) => Object.keys(d).some((k) => k.startsWith("__react"))));
  await page.waitForTimeout(500);
}

test("the account menu stays open when the page's script arrives after the click", async ({ context, page }) => {
  await signInAs(context, 2);
  await openBeforeScript(page, "Account menu");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("so does the notifications menu", async ({ context, page }) => {
  await signInAs(context, 2);
  await openBeforeScript(page, /^Notifications/);
  await expect(page.locator("details", { has: page.getByLabel(/^Notifications/) })).toHaveAttribute("open", "");
});
