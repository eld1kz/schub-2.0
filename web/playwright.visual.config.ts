import { defineConfig, devices } from "@playwright/test";

// Screenshot tests (npm run test:visual, DESIGN.md). scripts/visual.sh starts the app on port 3103 with a fixed
// date against the seeded local Supabase, then runs these inside the Playwright Docker image, so fonts and
// antialiasing match on every machine and in CI. Each page at 1440 and 390 wide, light and dark.
const desktop = { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } };
const phone = { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

export default defineConfig({
  testDir: "tests/visual",
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  reporter: [["list"]],
  expect: {
    timeout: 15_000,
    toHaveScreenshot: { animations: "disabled", caret: "hide", scale: "css", maxDiffPixelRatio: 0.001, stylePath: "tests/visual/screenshot.css" },
  },
  use: { baseURL: "http://localhost:3103", trace: "retain-on-failure" },
  projects: [
    { name: "desktop-light", use: { ...desktop, colorScheme: "light" } },
    { name: "desktop-dark", use: { ...desktop, colorScheme: "dark" } },
    { name: "phone-light", use: { ...phone, colorScheme: "light" } },
    { name: "phone-dark", use: { ...phone, colorScheme: "dark" } },
  ],
});
