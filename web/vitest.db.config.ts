import { defineConfig } from "vitest/config";

// Database permission tests (npm run test:db) against the local Supabase from npm run db:local.
// One file at a time: they share the database.
export default defineConfig({
  test: {
    include: ["tests/db/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
