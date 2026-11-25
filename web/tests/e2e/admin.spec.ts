import { expect, test, type Page } from "@playwright/test";
import { id, service, signInAs, signInAsAdmin, signUpNew } from "./auth";
import { totp } from "../totp";
import { pick } from "./combobox";

// The admin area (/admin) and what goes with it: two-factor in /settings, Report links, suspensions, visit counts.
// Seed: student 20 is the admin, with an authenticator; 13 (Eunbi Notreal) is reported for spam, team 5
// (Fakename Growth Squad, owner 11) as fake.
const team5 = "00000000-0000-4000-a000-000000000005";
const grant = "00000000-0000-4000-9000-000000000003";
const pages = ["/admin", "/admin/reports", "/admin/imports", "/admin/people", `/admin/people/${id(13)}`, "/admin/events", `/admin/events/${grant}`, "/admin/log"];

const logCount = async () => (await service().from("admin_actions").select("id", { count: "exact", head: true })).count ?? 0;

test.afterEach(async () => {
  const db = service();
  await db.from("profiles").update({ hidden_at: null }).eq("id", id(13));
  await db.from("teams").update({ hidden_at: null }).eq("id", team5);
  await db.from("suspensions").delete().neq("user_id", id(20));
  await db.from("reports").update({ status: "open", resolved_at: null }).neq("status", "open");
  await db.from("opportunities").update({ featured: false, status: "live" }).eq("id", grant);
});

test("signed out: every admin page is not found, never cached or indexed", async ({ request }) => {
  for (const path of [...pages, "/admin/verify"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(404);
    expect(res.headers()["x-robots-tag"], path).toContain("noindex");
    expect(res.headers()["cache-control"], path).toContain("no-store");
  }
});

test("a member: every admin page is not found, and the menu has no Admin", async ({ context, page }) => {
  await signInAs(context, 1);
  for (const path of [...pages, "/admin/verify"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
    await expect(page.getByRole("heading", { name: "Admin", exact: true })).toBeHidden();
  }
  await page.goto("/opportunities");
  await page.getByLabel("Account menu").click();
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Admin" })).toBeHidden();
});

test("the admin without the code: every page asks for it first, then opens", async ({ context, page }) => {
  await signInAs(context, 20);
  for (const path of pages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Enter your 6-digit code" }), path).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Admin" })).toBeHidden();
  }
  // The menu shows Admin, which leads to the same screen
  await page.getByLabel("Account menu").click();
  await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();

  await page.goto("/admin/reports");
  await page.getByLabel("6-digit code").fill("000000");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "didn't work" })).toBeVisible();
  await page.getByLabel("6-digit code").fill(totp("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP"));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/admin\/reports$/);
  await expect(page.getByRole("navigation", { name: "Admin" })).toBeVisible();
});

// Opens a ReasonAction, fills the reason and confirms it
async function act(scope: ReturnType<Page["locator"]> | Page, label: string, reason: string) {
  await scope.getByText(label, { exact: true }).click();
  const open = scope.locator("details[open]");
  if (reason) await open.getByPlaceholder(/^Reason/).fill(reason);
  await open.getByRole("button", { name: `Confirm: ${label}` }).click();
}

test("the admin with the code: overview, then reports: dismiss and hide, each logged once", async ({ context, page, browser }) => {
  await signInAsAdmin(context);
  await page.goto("/admin");
  await expect(page.getByText("Signups, last 30 days")).toBeVisible();
  await expect(page.getByText("Open reports")).toBeVisible();

  await page.goto("/admin/reports");
  const team = page.getByRole("listitem").filter({ hasText: "Fakename Growth Squad" });
  // A reason is required
  let before = await logCount();
  await team.getByText("Dismiss", { exact: true }).click();
  await team.getByRole("button", { name: "Confirm: Dismiss" }).click();
  expect(await service().from("reports").select("status").eq("target_id", team5).single()).toMatchObject({ data: { status: "open" } });
  await team.locator("details[open]").getByPlaceholder(/^Reason/).fill("Real team, checked");
  await team.getByRole("button", { name: "Confirm: Dismiss" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Fakename Growth Squad" })).toBeHidden();
  expect(await logCount()).toBe(before + 1);

  before = await logCount();
  const person = page.getByRole("listitem").filter({ hasText: "Eunbi Notreal" });
  await act(person, "Hide profile", "Spam account");
  await expect(page.getByRole("listitem").filter({ hasText: "Eunbi Notreal" })).toBeHidden();
  expect(await logCount()).toBe(before + 1);

  // Hidden: gone for everyone else, still there for the admin
  const other = await browser.newContext();
  await signInAs(other, 1);
  const otherPage = await other.newPage();
  // The page's own notFound() comes after its first bytes, so this is the not-found page with a 200 status
  await otherPage.goto(`/u/${id(13)}`);
  await expect(otherPage.getByText("This profile doesn't exist.")).toBeVisible();
  await otherPage.goto("/people");
  await expect(otherPage.getByText("Eunbi Notreal")).toBeHidden();
  await other.close();
  await page.goto(`/u/${id(13)}`);
  await expect(page.getByRole("heading", { name: "Eunbi Notreal" })).toBeVisible();

  // The log shows both, newest first
  await page.goto("/admin/log");
  await expect(page.getByRole("listitem").first()).toContainText("Spam account");
  await page.getByRole("link", { name: "Dismiss", exact: true }).click();
  await expect(page.getByRole("listitem").first()).toContainText("Real team, checked");
});

test("the admin suspends a member, who can still browse but not write, then unsuspends", async ({ context, page, browser }) => {
  await signInAsAdmin(context);
  await page.goto("/admin/people?q=Dana");
  await page.getByRole("link", { name: /Dana Mockingbird/ }).click();
  await expect(page.getByText("Teams started")).toBeVisible();
  await act(page, "Suspend", "Harassing people in messages");
  await expect(page.getByText(/^Suspended since/)).toBeVisible();

  const member = await browser.newContext();
  await signInAs(member, 15);
  const memberPage = await member.newPage();
  await memberPage.goto(`/u/${id(12)}`);
  await expect(memberPage.getByText("Your account is suspended.")).toBeVisible();
  await expect(memberPage.getByText("Harassing people in messages")).toBeVisible();
  await memberPage.getByRole("button", { name: "Connect" }).first().click();
  await expect(memberPage.getByText("Couldn't send the request. Try again.")).toBeVisible();
  expect((await service().from("connections").select("id").eq("sender_id", id(15)).eq("receiver_id", id(12))).data).toEqual([]);

  await act(page, "Unsuspend", "");
  await expect(page.getByText(/^Suspended since/)).toBeHidden();
  await memberPage.reload();
  await expect(memberPage.getByText("Your account is suspended.")).toBeHidden();
  await member.close();
});

test("the admin features, edits and hides an event", async ({ context, page }) => {
  const { data: seeded } = await service().from("opportunities").select("organizer, url").eq("id", grant).single();
  const organizer = seeded?.organizer;
  const edited = `Edited Foundation ${Date.now()}`;
  // Saving checks the event's link opens, over the network; the seeded one is a made-up page
  await service().from("opportunities").update({ url: "https://example.com/" }).eq("id", grant);
  await signInAsAdmin(context);
  await page.goto("/admin/events?q=Notreal");
  const row = page.getByRole("listitem").filter({ hasText: "Notreal Startup Grant" });
  await row.getByRole("button", { name: "Feature" }).click();
  await expect(row.getByText("Featured", { exact: true })).toBeVisible();

  await row.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Organizer").fill(edited);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/events$/);
  const { data: edit } = await service().from("admin_actions").select("action, details").order("id", { ascending: false }).limit(1).single();
  expect(edit).toMatchObject({ action: "edit", details: { before: { organizer }, after: { organizer: edited } } });

  await page.goto("/admin/events?q=Notreal");
  await act(page.getByRole("listitem").filter({ hasText: "Notreal Startup Grant" }), "Hide", "Grant was withdrawn");
  // Gone from the live list once it's hidden
  await expect(page.getByRole("listitem").filter({ hasText: "Notreal Startup Grant" })).toBeHidden();
  await page.goto("/admin/events?view=hidden");
  await act(page.getByRole("listitem").filter({ hasText: "Notreal Startup Grant" }), "Restore", "");
  await expect(page.getByRole("listitem").filter({ hasText: "Notreal Startup Grant" })).toBeHidden();
  await page.goto("/admin/events?q=Notreal");
  await expect(page.getByRole("listitem").filter({ hasText: "Notreal Startup Grant" })).toBeVisible();
  await service().from("opportunities").update({ organizer, url: seeded?.url }).eq("id", grant);
});

test("the admin rejects an import with a reason; it's gone and logged", async ({ context, page }) => {
  const luma = "00000000-0000-4000-9000-000000000009";
  try {
    await signInAsAdmin(context);
    await page.goto("/admin/imports");
    const item = page.getByRole("article", { name: "Sample Luma Builders Night" });
    await act(item, "Reject", "Not a real event");
    await expect(item).toHaveCount(0);
    expect((await service().from("opportunities").select("status, needs_review").eq("id", luma).single()).data).toEqual({ status: "removed", needs_review: false });
    const { data } = await service().from("admin_actions").select("action, reason").order("id", { ascending: false }).limit(1).single();
    expect(data).toEqual({ action: "reject", reason: "Not a real event" });
  } finally {
    await service().from("opportunities").update({ status: "live", needs_review: true, reviewed_at: null }).eq("id", luma);
  }
});

test("anyone can turn two-factor on in Settings with an authenticator app, and off again with a code", async ({ context, page }) => {
  await signUpNew(context, "Twofa Tester");
  await page.goto("/settings");
  await page.getByRole("button", { name: "Set up two-factor" }).click();
  await expect(page.getByRole("img", { name: "QR code for your authenticator app" })).toBeVisible();
  const secret = (await page.getByTestId("totp-secret").textContent()) ?? "";
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Turn on" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "didn't work" })).toBeVisible();
  await page.getByLabel("6-digit code").fill(totp(secret));
  await page.getByRole("button", { name: "Turn on" }).click();
  await expect(page.getByText("On.", { exact: true })).toBeVisible();

  // Each code works once, so wait for the next one
  await page.waitForTimeout(30_000 - (Date.now() % 30_000) + 500);
  await page.getByText("Turn off two-factor").click();
  await page.getByLabel("Enter a current code to turn it off").fill(totp(secret));
  await page.getByRole("button", { name: "Turn off" }).click();
  await expect(page.getByRole("button", { name: "Set up two-factor" })).toBeVisible();
});

test("members report a team from its page, once", async ({ context, page }) => {
  await signInAs(context, 1);
  await page.goto(`/teams/${team5}`);
  await page.getByText("Report this team").click();
  await pick(page.getByRole("combobox", { name: "What's wrong" }), "Spam");
  await page.getByLabel("Anything to add (optional)").fill("Same post every day");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText("You reported this team as spam.")).toBeVisible();
  const { data } = await service().from("reports").select("reason, note, status").eq("target_id", team5).eq("reporter_id", id(1)).single();
  expect(data).toEqual({ reason: "spam", note: "Same post every day", status: "open" });
  await service().from("reports").delete().eq("target_id", team5).eq("reporter_id", id(1));

  // Not on your own team
  await page.goto("/teams/00000000-0000-4000-a000-000000000001");
  await expect(page.getByText("Report this team")).toBeHidden();
});

test("opening a team page from a story image or a shared link counts a visit", async ({ page }) => {
  const day = new Date().toISOString().slice(0, 10);
  const count = async (ref: string) => Number((await service().from("visits").select("count").eq("day", day).eq("ref", ref).maybeSingle()).data?.count ?? 0);
  const [story, link] = [await count("story"), await count("link")];
  await page.goto(`/teams/${team5}?ref=story`);
  await page.goto(`/teams/${team5}?ref=link`);
  await page.goto(`/teams/${team5}`);
  await expect.poll(() => count("story")).toBe(story + 1);
  await expect.poll(() => count("link")).toBe(link + 1);
});
