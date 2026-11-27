import { Linter, type ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import designTokens, { problem } from "./design-tokens.mjs";

describe("problem", () => {
  it("allows the tokens, named layouts and arbitrary variants", () => {
    for (const ok of ["text-sm", "sm:text-3xl", "text-display", "px-4", "-mt-1.5", "gap-x-4", "pb-bar", "pb-safe", "mt-20", "bg-accent", "text-danger/75", "grid-cols-label", "has-[:checked]:border-accent", "[@media(hover:hover)]:opacity-0", "h-4.5", "max-w-narrow"]) {
      expect(problem(ok), ok).toBeNull();
    }
  });

  it("rejects bracket values, palette colors, steps off the scale and unknown type sizes", () => {
    for (const bad of ["text-[13px]", "sm:mt-[5px]", "grid-cols-[120px_1fr]", "bg-[rgba(0,0,0,0.5)]", "[color:red]", "text-zinc-500", "hover:bg-indigo-600", "bg-white", "border-black/10", "mt-5", "px-2.5", "gap-10", "text-4xl", "text-5xl"]) {
      expect(problem(bad), bad).not.toBeNull();
    }
  });
});

describe("no-raw-styles", () => {
  const linter = new Linter({ configType: "flat" });
  // The rule is plain JavaScript, so its object has no ESLint types
  const plugin = designTokens as unknown as ESLint.Plugin;
  const config: Linter.Config[] = [{ files: ["**/*.tsx"], languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } }, plugins: { design: plugin }, rules: { "design/no-raw-styles": "error" } }];
  const lint = (code: string) => linter.verify(code, config, "page.tsx").map((m) => m.message);

  it("checks class strings, template literals and classes kept in variables, and style=", () => {
    expect(lint('const a = <p className="text-sm text-ink2">ok</p>;')).toEqual([]);
    expect(lint('const a = <p className="text-[15px]">x</p>;')).toHaveLength(1);
    expect(lint("const c = `p-4 ${x} mt-[3px]`;")).toHaveLength(1);
    expect(lint('const button = "bg-red-600";')).toHaveLength(1);
    expect(lint("const a = <p style={{ color: 'red' }}>x</p>;")).toEqual(["No inline style= outside src/components/ui; use tokens or a component"]);
  });
});
