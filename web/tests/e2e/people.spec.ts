import { expect, test } from "@playwright/test";
import { service, signInAs } from "./auth";

// 25 extra people who all have Solidity and Rust (no seeded student has both), removed afterwards
const extra: string[] = [];

test.beforeAll(async () => {
  const admin = service();
  for (let i = 0; i < 25; i++) {
    const { data, error } = await admin.auth.admin.createUser({ email: `paging-${i}-${crypto.randomUUID()}@schub.test`, email_confirm: true, user_metadata: { name: `Paging Person ${i}` } });
    if (error || !data.user) throw error;
    extra.push(data.user.id);
  }
  await admin.from("profiles").update({ skills: ["Solidity", "Rust"] }).in("id", extra);
});

test.afterAll(async () => {
  const admin = service();
  for (const user of extra) await admin.auth.admin.deleteUser(user);
});

test("Discover filters and pages in the query", async ({ context, page }) => {
  await signInAs(context, 2);
  const rows = page.getByRole("main").getByRole("article");

  // Everyone named, minus yourself and the people you're connected to or have a pending request with
  const { count: named } = await service().from("profiles").select("id", { count: "exact", head: true }).neq("name", "");
  const elsewhere = 3; // B: accepted with 08, pending from 09, and B themselves
  const total = (named ?? 0) - elsewhere;
  const pages = Math.ceil(total / 20);

  await page.goto("/people");
  await expect(rows).toHaveCount(20);
  await expect(page.getByText(`Page 1 of ${pages}`)).toBeVisible();
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText(`Page 2 of ${pages}`)).toBeVisible();

  await page.goto(`/people?page=${pages}`);
  await expect(rows).toHaveCount(total - 20 * (pages - 1));
  await expect(page.getByRole("link", { name: "Next", exact: true })).toBeHidden();

  // Skills filter: only the 25 have both, so 2 pages
  await page.goto("/people?skills=Solidity,Rust");
  await expect(rows).toHaveCount(20);
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(rows).toHaveCount(5);
  await expect(page.getByRole("main").getByRole("link", { name: /^Paging Person/ })).toHaveCount(5);
  // People connected to B never show up
  await expect(page.getByRole("link", { name: "Taeho Stubbs" })).toBeHidden();
});

test("the profile sidebar suggests a few open collaborators you aren't connected to", async ({ context, page }) => {
  await signInAs(context, 2);
  await page.goto(`/u/${(await service().from("profiles").select("id").eq("name", "Minji Placeholder").single()).data?.id}`);
  const sidebar = page.locator("section").filter({ has: page.getByRole("heading", { name: "People you may team up with" }) });
  // It streams in after the page loads
  await expect(sidebar.getByRole("listitem").first()).toBeVisible();
  const names = await sidebar.getByRole("listitem").getByRole("link").allInnerTexts();
  expect(names.length).toBeGreaterThan(0);
  expect(names.length).toBeLessThanOrEqual(4);
  // Not the profile, not you, not people you're connected to or asked
  for (const name of ["Minji Placeholder", "Jisoo Sampleton", "Taeho Stubbs", "Ara Lorem"]) {
    expect(names.join("\n")).not.toContain(name);
  }
});
