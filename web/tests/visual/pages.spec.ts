import { expect, test } from "@playwright/test";
import { id, signInAs } from "../e2e/auth";

// The main pages, against supabase/seed.local.sql. Run with npm run test:visual; after an intended change,
// npm run test:visual:update and review the new images before committing them.
const team = "00000000-0000-4000-a000-000000000003";
const pages: { name: string; path: string; as?: number }[] = [
  { name: "landing", path: "/" },
  { name: "profile-owner", path: `/u/${id(1)}`, as: 1 },
  { name: "profile-visitor", path: `/u/${id(1)}`, as: 2 },
  { name: "teams", path: "/teams", as: 1 },
  // Its owner, who sees the applicants
  { name: "team", path: `/teams/${team}`, as: 2 },
  { name: "opportunities", path: "/opportunities", as: 1 },
  { name: "people", path: "/people", as: 1 },
];

for (const p of pages) {
  test(p.name, async ({ context, page }) => {
    if (p.as) await signInAs(context, p.as);
    await page.goto(p.path);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`${p.name}.png`, { fullPage: true });
  });
}
