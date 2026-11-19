import { expect, test } from "@playwright/test";
import { id, service } from "./auth";

const accounts = async () => (await service().auth.admin.listUsers({ perPage: 1000 })).data.users.length;

// No session at all: the visitor browses read-only and no account is created for them
test("signed-out visitors browse without an account", async ({ page }) => {
  const before = await accounts();

  await page.goto("/opportunities");
  await expect(page.getByText("Placeholder Hack Seoul 2027").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();

  await page.goto("/people");
  await expect(page.getByRole("main").getByRole("article").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in to connect" }).first()).toBeVisible();

  await page.goto(`/u/${id(1)}`);
  await expect(page.getByRole("heading", { name: "Minji Placeholder", level: 1 })).toBeVisible();
  // Contact details are never shown to signed-out visitors
  await expect(page.getByText("t.me/fake_student_1")).toBeHidden();

  await page.goto("/teams/00000000-0000-4000-a000-000000000003");
  await expect(page.getByRole("button", { name: "Sign in to apply" }).first()).toBeVisible();

  expect(await accounts()).toBe(before);
  const cookies = await page.context().cookies();
  expect(cookies.filter((c) => c.name.includes("auth-token"))).toEqual([]);
});
