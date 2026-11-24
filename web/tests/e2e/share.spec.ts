import { expect, test, type APIResponse, type BrowserContext, type Page } from "@playwright/test";
import { id, service, signInAs } from "./auth";

const team = (n: number) => `00000000-0000-4000-a000-${String(n).padStart(12, "0")}`;
const robotics = team(4); // owned by student 14, roles iOS and Product filled, Design open

// Width and height from a PNG's IHDR chunk
async function png(res: APIResponse) {
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
  const bytes = await res.body();
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes };
}

test("the story image is a 1080x1920 PNG for an open team, a full team and an own project", async ({ request }) => {
  for (const n of [1, 2, 5]) {
    const res = await request.get(`/teams/${team(n)}/story.png`);
    expect(await png(res), `team ${n}`).toMatchObject({ width: 1080, height: 1920 });
    // About an hour: days left changes daily
    expect(res.headers()["cache-control"]).toContain("max-age=3600");
  }
  const light = await png(await request.get(`/teams/${robotics}/story.png`));
  const dark = await png(await request.get(`/teams/${robotics}/story.png?theme=dark`));
  expect(dark).toMatchObject({ width: 1080, height: 1920 });
  expect(dark.bytes.equals(light.bytes)).toBe(false);
  expect((await request.get(`/teams/00000000-0000-4000-a000-0000000000ff/story.png`)).status()).toBe(404);
});

test("Korean and Russian titles render", async ({ page, request }) => {
  const db = service();
  const rows = [
    { id: "00000000-0000-4000-a000-0000000000e1", owner_id: id(3), title: "대학생을 위한 AI 스터디 메이트", roles: ["iOS 개발자", "디자이너"] },
    { id: "00000000-0000-4000-a000-0000000000e2", owner_id: id(4), title: "Сервис для поиска команды на хакатоны", roles: ["Бэкенд-разработчик", "Дизайнер", "Маркетолог"] },
  ];
  await db.from("teams").insert(rows.map((r) => ({ ...r, description: "" })));
  try {
    for (const r of rows) {
      for (const theme of ["light", "dark"]) {
        expect(await png(await request.get(`/teams/${r.id}/story.png?theme=${theme}`))).toMatchObject({ width: 1080, height: 1920 });
      }
      expect(await png(await request.get(`/teams/${r.id}/og.png`))).toMatchObject({ width: 1200, height: 630 });
    }
    // A mostly Hangul team gets its link preview in Korean; the Russian one stays English
    await page.goto(`/teams/${rows[0].id}`);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", "모집 중: iOS 개발자, 디자이너 · 자체 프로젝트");
    await page.goto(`/teams/${rows[1].id}`);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", /^Needs: /);
  } finally {
    await db.from("teams").delete().in("id", rows.map((r) => r.id));
  }
});

test("team pages have a link preview with the open roles and the event", async ({ page, request }) => {
  await page.goto(`/teams/${robotics}`);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", "Needs: Design · For Placeholder Hack Seoul 2027");
  const image = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(image).toMatch(new RegExp(`/teams/${robotics}/og\\.png\\?v=\\w+$`));
  expect(await png(await request.get(new URL(image!).pathname))).toMatchObject({ width: 1200, height: 630 });
});

// What the device says it can do, which picks the dialog's layout: whether it can share files, and whether
// it has a mouse or trackpad (pointer: fine)
async function device(context: BrowserContext, { files, fine }: { files: boolean; fine: boolean }) {
  await context.addInitScript(({ files: yes, fine }) => {
    const media = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => (query === "(pointer: fine)" ? ({ ...media(query), matches: fine, media: query } as MediaQueryList) : media(query));
    const shared: { type: string; name: string }[] = [];
    Object.assign(window, { shared });
    Object.defineProperty(Navigator.prototype, "canShare", { configurable: true, value: yes ? () => true : undefined });
    Object.defineProperty(Navigator.prototype, "share", {
      configurable: true,
      value: yes ? async (data: ShareData) => void shared.push(...(data.files ?? []).map((f) => ({ type: f.type, name: f.name }))) : undefined,
    });
  }, { files, fine });
}

async function download(page: Page) {
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("dialog").getByRole("link", { name: "Download image" }).click()]);
  expect(file.suggestedFilename()).toBe("schub-testerson-robotics.png");
  const path = await file.path();
  const { readFileSync } = await import("node:fs");
  expect(readFileSync(path).subarray(1, 4).toString()).toBe("PNG");
}

test("on a laptop the share dialog offers the phone QR code, copying and Download", async ({ context, page }) => {
  await device(context, { files: false, fine: true });
  await page.goto(`/teams/${robotics}`);
  // Everyone sees Share, signed out too
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Share this team" });
  await expect(dialog.getByRole("region", { name: "Post to your story from your phone" }).getByRole("img", { name: "QR code to the share page" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Copy link" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Share", exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("img", { name: /Story image/ })).toHaveAttribute("src", /theme=light/);

  await dialog.getByRole("button", { name: "dark" }).click();
  await expect(dialog.getByRole("img", { name: /Story image/ })).toHaveAttribute("src", /theme=dark/);
  await download(page);
});

test("a laptop that can share files still gets the laptop layout, with Share as a secondary option", async ({ context, page }) => {
  await device(context, { files: true, fine: true });
  await page.goto(`/teams/${robotics}`);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Share this team" });
  await expect(dialog.getByRole("region", { name: "Post to your story from your phone" })).toBeVisible();
  // In this order after the QR code: Copy image (Chromium can copy images), Share, Copy link, Download
  const actions = dialog.locator("[data-layout=laptop] button, [data-layout=laptop] a").filter({ hasText: /^(Copy image|Share|Copy link|Download image)$/ });
  await expect(actions).toHaveText(["Copy image", "Share", "Copy link", "Download image"]);
  // Secondary (outlined), not the accent-filled primary
  await expect(dialog.getByRole("button", { name: "Share", exact: true })).toHaveClass(/(^|\s)border-line2(\s|$)/);
  await dialog.getByRole("button", { name: "Share", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { shared: unknown[] }).shared)).toHaveLength(1);
});

test("on a phone the share dialog sends the image file with Share", async ({ context, page }) => {
  await device(context, { files: true, fine: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/teams/${robotics}`);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Share this team" });
  await expect(dialog.getByRole("region", { name: "Post to your story from your phone" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Copy link" })).toBeVisible();
  const share = dialog.getByRole("button", { name: "Share", exact: true });
  await expect(share).toBeEnabled();
  await share.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { shared: unknown[] }).shared)).toEqual([{ type: "image/png", name: "schub-testerson-robotics.png" }]);
  await download(page);
});

test("the phone share page opens with the theme from the QR code", async ({ context, page }) => {
  await device(context, { files: true, fine: false });
  await page.goto(`/teams/${robotics}/share?theme=dark`);
  await expect(page.getByRole("img", { name: /Story image/ })).toHaveAttribute("src", /theme=dark/);
  await expect(page.getByRole("button", { name: "dark" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Share", exact: true })).toBeEnabled();
});

test("owners get Share as the main button, and on their rows in Your teams", async ({ context, page }) => {
  await signInAs(context, 14);
  await page.goto(`/teams/${robotics}`);
  // Primary: filled with the accent
  await expect(page.getByRole("button", { name: "Share", exact: true })).toHaveClass(/(^|\s)bg-accent(\s|$)/);
  await page.goto("/teams/mine");
  await page.getByRole("button", { name: "Share Testerson Robotics" }).click();
  await expect(page.getByRole("dialog", { name: "Share this team" }).getByRole("img", { name: "Story image for Testerson Robotics" })).toBeVisible();
});
