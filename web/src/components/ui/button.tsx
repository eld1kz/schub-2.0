import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps } from "react";
import Link from "next/link";

// Buttons (DESIGN.md). primary: the one main action in a place, in the accent. secondary: outlined, for the
// rest. quiet: plain text, for small or undoing actions (Leave, Withdraw, Cancel in a row). danger: filled red,
// only to confirm something that can't be undone. accent: outlined in the accent, for reaching out to someone
// (Invite, Connect in a list of suggestions) and an owner's "+ Add" for an empty section.
export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger" | "accent";
// sm: rows and bars (36px). md: forms and headers (38px). touch: 44px on phones, md from sm up.
// lg: 44px everywhere with larger text, for full-width buttons that are the whole point of a screen (sign-in, share).
// xs: 30px with small text, beside names in a side column.
export type ButtonSize = "xs" | "sm" | "md" | "touch" | "lg";

const base = "shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold disabled:opacity-40";
const variants: Record<ButtonVariant, string> = {
  primary: "rounded-md bg-accent text-on-accent hover:opacity-90",
  secondary: "rounded-md border border-line2 bg-background hover:border-muted",
  quiet: "font-normal text-ink2 hover:text-foreground",
  danger: "rounded-md bg-danger text-background hover:opacity-90",
  accent: "rounded-md border border-accent text-accent hover:bg-accent-soft",
};
const heights: Record<ButtonSize, string> = { xs: "h-7.5 text-meta", sm: "h-9 text-sm", md: "h-[38px] text-sm", touch: "h-11 text-sm sm:h-[38px]", lg: "h-11 text-base" };

// `full`: the whole width on phones, its own width from sm up. `showFrom`: hidden on phones (they get another way in).
export function buttonClass({ variant = "primary", size = "md", full = false, showFrom }: { variant?: ButtonVariant; size?: ButtonSize; full?: boolean; showFrom?: "sm" } = {}) {
  const padding = variant === "quiet" ? "" : size === "xs" || (variant === "accent" && size === "sm") ? "px-3" : variant === "secondary" || variant === "accent" || size === "sm" ? "px-4" : "px-5";
  const display = showFrom ? "hidden sm:inline-flex" : "inline-flex";
  return [display, base, variants[variant], heights[size], padding, full ? "w-full sm:w-auto" : ""].filter(Boolean).join(" ");
}

type Style = { variant?: ButtonVariant; size?: ButtonSize; full?: boolean; showFrom?: "sm" };

export function Button({ variant, size, full, showFrom, className = "", type = "submit", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & Style) {
  return <button type={type} className={`${buttonClass({ variant, size, full, showFrom })} ${className}`} {...props} />;
}

// A link that looks like a button
export function ButtonLink({ variant, size, full, showFrom, className = "", ...props }: ComponentProps<typeof Link> & Style) {
  return <Link className={`${buttonClass({ variant, size, full, showFrom })} ${className}`} {...props} />;
}

// The same, for a page somewhere else (opens in a new tab)
export function ButtonAnchor({ variant, size, full, showFrom, className = "", ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & Style) {
  return <a target="_blank" rel="noreferrer" className={`${buttonClass({ variant, size, full, showFrom })} ${className}`} {...props} />;
}

// A square icon button (34px): the pencil, Close, Share in a row. `label` is what it says to screen readers.
export function IconButton({ label, className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-md text-ink2 hover:bg-chip hover:text-foreground ${className}`}
      {...props}
    />
  );
}
