// Driving the design system's Combobox (src/components/ui/combobox.tsx) from the tests
import { expect, type Locator, type Page } from "@playwright/test";

// Opens it. Retried, since a click before the page is interactive does nothing.
export async function open(trigger: Locator) {
  await expect(async () => {
    if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true", { timeout: 1000 });
  }).toPass();
}

// The option reading `label` in the open list, whatever count follows it
export const option = (page: Page, label: string) => page.getByRole("option").filter({ has: page.getByText(label, { exact: true }) });

export async function pick(trigger: Locator, label: string) {
  await open(trigger);
  await option(trigger.page(), label).click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
}
