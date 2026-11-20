import { expect, test } from "@playwright/test";
import { id, service, signInAs } from "./auth";

// Student 18 (Jaden) runs Prototype Fintech: Rin (17) is accepted, 1 and 19 are pending. No other test uses 18.
const fintech = "00000000-0000-4000-a000-000000000006";

test("delete your account from Settings: signed out, profile gone, the team handed over", async ({ context, page }) => {
  await signInAs(context, 18);
  await context.addCookies([{ name: "last_sign_in_method", value: "github", domain: "localhost", path: "/" }]);
  // A photo in their folder, which has to go too
  const photo = `${id(18)}/e2e-delete.png`;
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
  expect((await service().storage.from("media").upload(photo, png, { contentType: "image/png", upsert: true })).error).toBeNull();

  await page.goto("/opportunities");
  await page.getByLabel("Account menu").click();
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByText("student18@schub.test")).toBeVisible();
  await expect(page.getByText("Not linked")).toHaveCount(2);

  await page.getByRole("button", { name: "Delete account" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete your account" });
  await expect(dialog).toContainText("This can't be undone.");
  const confirm = dialog.getByRole("button", { name: "Delete my account" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Type DELETE to confirm").fill("delete");
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
  await confirm.click();

  // Signed out, on the landing page, with the sign-in method forgotten
  await expect(page).toHaveURL(/\/\?deleted=1$/);
  await expect(page.getByRole("status")).toHaveText("Your account was deleted.");
  await expect(page.getByRole("heading", { level: 1, name: "Find teammates for hackathons and projects." })).toBeVisible();
  expect((await context.cookies()).map((c) => c.name)).not.toContain("last_sign_in_method");
  expect((await context.cookies()).some((c) => c.name.includes("auth-token"))).toBe(false);

  // The profile's not-found page
  await page.goto(`/u/${id(18)}`);
  await expect(page.getByText("This profile doesn't exist.")).toBeVisible();

  await page.goto(`/teams/${fintech}`);
  await expect(page.getByText("Started by")).toContainText("Rin Sandbox");

  const { data: files } = await service().storage.from("media").list(id(18));
  expect(files ?? []).toEqual([]);
});

test("the only admin is told they can't delete their account yet", async ({ context, page }) => {
  await signInAs(context, 20);
  await page.goto("/settings");
  await expect(page.getByText("You're the only admin. Make someone else an admin before deleting your account.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete account" })).toHaveCount(0);
});
