import { expect, test } from "@playwright/test";
import { signUpNew } from "./auth";

test("a new user goes through onboarding and lands on opportunities", async ({ context, page }) => {
  const userId = await signUpNew(context, "Newbie Testcase");
  await page.goto("/onboarding");

  // Step 1: university is required
  await expect(page.getByRole("heading", { name: "What do you study?" })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Add your university to continue.")).toBeVisible();
  await page.getByLabel("University").fill("KAIST");
  await page.locator("#graduation_year").selectOption("2028");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 2: at least one skill
  await expect(page.getByRole("heading", { name: "What can you build?" })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Pick at least one skill to continue.")).toBeVisible();
  await page.getByPlaceholder("Search skills").fill("Rust");
  await page.getByRole("button", { name: "Rust", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 3: goals, then finish
  await expect(page.getByRole("heading", { name: "What are you looking for?" })).toBeVisible();
  await page.getByLabel("Hackathon team").check();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page).toHaveURL(/\/opportunities$/);

  await page.goto(`/u/${userId}`);
  await expect(page.getByText("KAIST").first()).toBeVisible();
  await expect(page.getByText("Rust").first()).toBeVisible();
});
