import { defineConfig, devices } from "@playwright/test";

// End-to-end tests (npm run test:e2e) against dev:local, which uses the local Supabase only.
// One worker: the tests share the seeded database.
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3101",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev:local",
    url: "http://localhost:3101/opportunities",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
