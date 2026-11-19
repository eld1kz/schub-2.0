import { expect, test, type Page } from "@playwright/test";

// The local Supabase's built-in inbox (Mailpit, [local_smtp] in supabase/config.toml)
const inbox = "http://127.0.0.1:54324/api/v1";
const team = "/teams/00000000-0000-4000-a000-000000000001";

// The sign-in link in the newest email to `address` that arrived after `since`
async function signInLink(address: string, since: number) {
  let link = "";
  await expect
    .poll(async () => {
      const { messages } = await (await fetch(`${inbox}/search?query=${encodeURIComponent(`to:"${address}"`)}`)).json();
      const latest = messages.find((m: { Created: string }) => Date.parse(m.Created) >= since);
      if (!latest) return "";
      const { HTML } = await (await fetch(`${inbox}/message/${latest.ID}`)).json();
      link = (HTML.match(/href="([^"]+)"/)?.[1] ?? "").replaceAll("&amp;", "&");
      return link;
    })
    .not.toBe("");
  return link;
}

async function send(page: Page, address: string) {
  await page.getByRole("textbox", { name: "Email" }).fill(address);
  await page.getByRole("button", { name: "Send sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText("Check your inbox");
  await expect(page.getByRole("status")).toContainText(address);
}

test("a new email address gets a link, then onboarding", async ({ page }) => {
  const since = Date.now() - 1000;
  await page.goto("/login");

  // A typo: pick a different email, and the field starts empty
  await send(page, `typo-${crypto.randomUUID()}@schub.test`);
  await page.getByRole("button", { name: "Use a different email" }).click();
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue("");

  const address = `new-${crypto.randomUUID()}@schub.test`;
  await send(page, address);
  await page.goto(await signInLink(address, since));
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { name: "What do you study?" })).toBeVisible();
});

test("the email link brings a member back to the page they signed in from", async ({ page }) => {
  const since = Date.now() - 1000;
  await page.goto(team);
  await page.getByRole("link", { name: "Sign in to apply" }).first().click();
  await expect(page).toHaveURL(`/login?next=${encodeURIComponent(team)}`);

  await send(page, "student03@schub.test");
  await page.goto(await signInLink("student03@schub.test", since));
  await expect(page).toHaveURL(team);
  await expect(page.getByRole("link", { name: "Sign in to apply" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});

test("a failed sign-in comes back to /login with a message", async ({ page }) => {
  // What a provider does when someone cancels, or an expired link: no code
  await page.goto(`/auth/callback?error=access_denied&next=${encodeURIComponent(team)}`);
  await expect(page).toHaveURL(`/login?error=1&next=${encodeURIComponent(team)}`);
  await expect(page.getByText("Sign-in didn't work. Try again or use another option.")).toBeVisible();
});
