import { expect, test, type Page } from "@playwright/test";
import { id, service, signInAs } from "./auth";

// Student 06 (Joon Dummyson) has a sparse profile: no bio, interests, links, experience or projects
const me = id(6);

async function saveDialog(page: Page, name: string, fill: (dialog: ReturnType<Page["getByRole"]>) => Promise<void>) {
  const dialog = page.getByRole("dialog", { name });
  await expect(dialog).toBeVisible();
  await fill(dialog);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden();
}

test.beforeEach(async ({ context, page }) => {
  await signInAs(context, 6);
  page.on("dialog", (d) => d.accept()); // "Delete this experience?"
  await page.goto(`/u/${me}`);
});

test("edit every profile section", async ({ page }) => {
  await page.getByRole("button", { name: "Edit intro" }).click();
  await saveDialog(page, "Edit intro", (d) => d.getByLabel("Headline").fill("E2E headline"));
  await expect(page.getByText("E2E headline")).toBeVisible();

  await page.getByRole("button", { name: "+ Write about you" }).click();
  await saveDialog(page, "Edit about", (d) => d.getByLabel("About you").fill("Written by an end-to-end test."));
  await expect(page.getByText("Written by an end-to-end test.")).toBeVisible();

  await page.getByRole("button", { name: "Edit skills" }).click();
  await saveDialog(page, "Edit skills", async (d) => {
    await d.getByPlaceholder("Search skills").fill("Go");
    await d.getByRole("button", { name: "Go", exact: true }).click();
  });
  await expect(page.locator("main").getByText("Go", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Edit interests and goals" }).click();
  await saveDialog(page, "Edit interests & goals", (d) => d.getByLabel("Comma separated").fill("robots, music"));
  await expect(page.getByText("robots")).toBeVisible();

  await page.getByRole("button", { name: /Add links|Edit links/ }).click();
  await saveDialog(page, "Edit links", (d) => d.getByLabel("GitHub").fill("fake-e2e-user"));
  await expect(page.getByRole("link", { name: /github\.com\/fake-e2e-user/ })).toBeVisible();

  await page.getByRole("button", { name: "Edit contact" }).click();
  await saveDialog(page, "Edit contact", (d) => d.getByLabel("Telegram username").fill("e2e_handle"));
  await expect(page.getByRole("link", { name: "t.me/e2e_handle" })).toBeVisible();
});

test("add and delete an experience", async ({ page }) => {
  await page.getByRole("button", { name: "+ Add experience" }).click();
  const dialog = page.getByRole("dialog", { name: "Add experience" });
  await dialog.getByLabel("Title").fill("E2E Tester");
  await dialog.getByLabel("Organization").fill("Playwright Club");
  await dialog.getByLabel("I currently work here").check();
  await dialog.getByLabel("Start month").selectOption("03");
  await dialog.getByLabel("Start year").selectOption("2025");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: "E2E Tester" })).toBeVisible();
  await expect(page.getByText(/Mar 2025 – Present/)).toBeVisible();

  await page.getByRole("button", { name: "Edit E2E Tester" }).click();
  await page.getByRole("dialog", { name: "Edit experience" }).getByRole("button", { name: "Delete experience" }).click();
  await expect(page.getByRole("heading", { name: "E2E Tester" })).toBeHidden();
});

test("add and delete a project", async ({ page }) => {
  await page.getByRole("button", { name: "+ Add project" }).click();
  await saveDialog(page, "Add project", async (d) => {
    await d.getByLabel("Name").fill("E2E Project");
    await d.getByLabel("Link to it").fill("example.com/e2e");
  });
  await expect(page.getByText("E2E Project")).toBeVisible();

  await page.getByRole("button", { name: "Edit E2E Project" }).click();
  await page.getByRole("dialog", { name: "Edit project" }).getByRole("button", { name: "Delete project" }).click();
  await expect(page.getByText("E2E Project")).toBeHidden();
});

// The smallest valid PNG, as a file to pick
const png = (name: string) => ({
  name,
  mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64"),
});
const filesOf = async (user: string) => ((await service().storage.from("media").list(user)).data ?? []).map((f) => `${user}/${f.name}`);
const pathOf = (url: string) => decodeURIComponent(url.split("/storage/v1/object/public/media/")[1] ?? "");

test("replacing a photo or project image deletes the old file, and so does deleting the project", async ({ page }) => {
  const admin = service();

  // Profile photo, twice: only the latest stays
  for (const name of ["first.png", "second.png"]) {
    await page.getByRole("button", { name: "Edit intro" }).click();
    await saveDialog(page, "Edit intro", (d) => d.getByLabel(/^Photo/).setInputFiles(png(name)));
  }
  const { data: profile } = await admin.from("profiles").select("avatar_url").eq("id", me).single();
  expect(await filesOf(me)).toEqual([pathOf(profile?.avatar_url ?? "")]);

  // A project image, replaced: still one file per image in use
  await page.getByRole("button", { name: "+ Add project" }).click();
  await saveDialog(page, "Add project", async (d) => {
    await d.getByLabel("Name").fill("Image Project");
    await d.getByLabel(/^Image/).setInputFiles(png("project.png"));
  });
  await page.getByRole("button", { name: "Edit Image Project" }).click();
  await saveDialog(page, "Edit project", (d) => d.getByLabel(/^Image/).setInputFiles(png("project-2.png")));
  const { data: project } = await admin.from("projects").select("image_url").eq("user_id", me).eq("title", "Image Project").single();
  expect((await filesOf(me)).sort()).toEqual([pathOf(profile?.avatar_url ?? ""), pathOf(project?.image_url ?? "")].sort());

  // Deleting the project deletes its image
  await page.getByRole("button", { name: "Edit Image Project" }).click();
  await page.getByRole("dialog", { name: "Edit project" }).getByRole("button", { name: "Delete project" }).click();
  await expect(page.getByText("Image Project")).toBeHidden();
  expect(await filesOf(me)).toEqual([pathOf(profile?.avatar_url ?? "")]);
});

test("a member without an uploaded photo shows their Google photo", async ({ page }) => {
  const db = service();
  const google = "https://lh3.googleusercontent.com/a/e2e-photo=s96-c";
  await db.from("profiles").update({ avatar_url: google }).eq("id", id(13));
  try {
    await page.goto(`/u/${id(13)}`);
    // Through the image optimizer, at the larger size
    await expect(page.getByRole("main").locator("img").first()).toHaveAttribute("src", new RegExp(encodeURIComponent("https://lh3.googleusercontent.com/a/e2e-photo=s256-c")));
  } finally {
    await db.from("profiles").update({ avatar_url: "" }).eq("id", id(13));
  }
});
