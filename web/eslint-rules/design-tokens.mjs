// Keeps pages on the design system (DESIGN.md). Outside src/components/ui, Tailwind classes must use the tokens in
// globals.css: no arbitrary values (text-[13px], mt-[5px]), no raw palette colors (zinc-500, indigo-600, white),
// spacing only on the scale, no type sizes that don't exist, and no inline style=. Any string in the code is
// checked, so classes kept in variables count too. Arbitrary variants (has-[:checked]:, [&+&]:) are fine.

const PALETTE = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white";
const COLOR_UTILS = "text|bg|border|ring|ring-offset|outline|fill|stroke|divide|decoration|placeholder|from|via|to|shadow|accent|caret";
const palette = new RegExp(`^(${COLOR_UTILS})(-[trblxyse])?-(${PALETTE})(-\\d+)?(/\\S+)?$`);
// Spacing steps, in Tailwind's quarter-rem units: 2-32px, then 48, 64 and 80px for layout, and the named ones
const STEPS = new Set(["0", "0.5", "1", "1.5", "2", "3", "4", "6", "8", "12", "16", "20", "auto", "bar", "safe", "safe-4"]);
const spacing = /^-?((?:m|p)[xytblrse]?|gap(?:-[xy])?|space-[xy]|scroll-[mp][xytblrse]?)-(.+)$/;
const SIZES = new Set(["xs", "meta", "sm", "base", "lg", "xl", "2xl", "3xl", "display"]);
const typeSize = /^text-(\d?xs|sm|base|lg|meta|display|\d?xl)$/;

// The utility part of a class: what's left after its variants (sm:, hover:, [&+&]:) and a leading "!"
function utility(token) {
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < token.length; i++) {
    const c = token[i];
    if (c === "[" || c === "(") depth++;
    else if (c === "]" || c === ")") depth--;
    else if (c === ":" && depth === 0) cut = i;
  }
  return token.slice(cut + 1).replace(/^!/, "");
}

export function problem(token) {
  const u = utility(token);
  if (/^-?[a-z][a-z0-9-]*-\[.+\]$/.test(u) || /^\[[a-z-]+:.+\]$/.test(u)) return `"${token}" is an arbitrary value; use a token from globals.css or a component from src/components/ui`;
  if (palette.test(u)) return `"${token}" is a raw palette color; use a color token (foreground, ink2, muted, accent, danger, ...)`;
  const s = u.match(spacing);
  if (s && !STEPS.has(s[2]) && !s[2].startsWith("(")) return `"${token}" is off the spacing scale (0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 20, bar, safe, safe-4)`;
  const t = u.match(typeSize);
  if (t && !SIZES.has(t[1])) return `"${token}" isn't a type size; use xs, meta, sm, base, lg, xl, 2xl, 3xl or display`;
  return null;
}

function check(context, node, text) {
  for (const token of text.split(/\s+/)) {
    if (!token) continue;
    const message = problem(token);
    if (message) context.report({ node, message });
  }
}

const plugin = {
  rules: {
    "no-raw-styles": {
      meta: { type: "problem", docs: { description: "Use the design tokens and src/components/ui" }, schema: [] },
      create(context) {
        return {
          JSXAttribute(node) {
            if (node.name.name === "style") context.report({ node, message: "No inline style= outside src/components/ui; use tokens or a component" });
          },
          Literal(node) {
            if (typeof node.value === "string") check(context, node, node.value);
          },
          TemplateElement(node) {
            check(context, node, node.value.cooked ?? node.value.raw);
          },
        };
      },
    },
  },
};

export default plugin;
