import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import designTokens from "./eslint-rules/design-tokens.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Pages use the tokens and src/components/ui only (DESIGN.md)
  {
    files: ["src/**/*.{ts,tsx}"],
    // story-image.tsx draws the share PNGs with next/og, which only takes inline styles
    ignores: ["src/components/ui/**", "src/lib/story-image.tsx", "**/*.test.{ts,tsx}"],
    plugins: { design: designTokens },
    rules: { "design/no-raw-styles": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
