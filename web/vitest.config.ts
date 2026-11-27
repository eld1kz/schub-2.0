import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests (npm test). Database tests have their own config (vitest.db.config.ts); Playwright runs tests/e2e.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts", "eslint-rules/**/*.test.ts"] },
});
