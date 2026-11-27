import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps } from "react";
import Link from "next/link";
import { Kbd } from "./kbd";
import { CheckIcon, Spinner } from "./spinner";

// Buttons (DESIGN.md). primary: the one main action in a place, in the accent. secondary: outlined, for the
// rest. quiet: plain text, for small or undoing actions (Leave, Withdraw, Cancel in a row). danger: filled red,
// only to confirm something that can't be undone. accent: outlined in the accent, for reaching out to someone
// (Invite, Connect in a list of suggestions) and an owner's "+ Add" for an empty section.
export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger" | "accent" | "bare";
// sm: rows and bars (36px). md: forms and headers (38px). touch: 44px on phones, md from sm up.
// lg: 44px everywhere with larger text, for full-width buttons that are the whole point of a screen (sign-in, share).
// xs: 30px with small text, beside names in a side column.
// bare: no look of its own, for a button styled by where it sits (a menu item, a text link) that still presses and loads.
export type ButtonSize = "xs" | "sm" | "md" | "touch" | "lg";

// A loading button is disabled too, but doesn't look it
const base = "pressable relative shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium [&:disabled:not([aria-busy])]:opacity-40";
const variants: Record<ButtonVariant, string> = {
  primary: "rounded-md border border-accent-hover bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "rounded-md border border-line2 bg-surface hover:border-foreground hover:bg-background",
  // Its edge appears with the fill; the text stays on the page's lines
  quiet: "-mx-2 rounded-md border border-transparent px-2 font-normal text-ink2 hover:bg-chip hover:text-foreground",
  danger: "rounded-md border border-danger-hover bg-danger text-background hover:bg-danger-hover",
  accent: "rounded-md border border-accent text-accent hover:bg-accent-soft",
  bare: "",
};
const heights: Record<ButtonSize, string> = { xs: "h-7.5 text-meta", sm: "h-9 text-sm", md: "h-[38px] text-sm", touch: "h-11 text-sm sm:h-[38px]", lg: "h-11 text-base" };

// `full`: the whole width on phones, its own width from sm up. `showFrom`: hidden on phones (they get another way in).
export function buttonClass({ variant = "primary", size = "md", full = false, showFrom }: { variant?: ButtonVariant; size?: ButtonSize; full?: boolean; showFrom?: "sm" } = {}) {
  if (variant === "bare") return "pressable relative";
  const padding = variant === "quiet" ? "" : size === "xs" || (variant === "accent" && size === "sm") ? "px-3" : variant === "secondary" || variant === "accent" || size === "sm" ? "px-4" : "px-5";
  const display = showFrom ? "hidden sm:inline-flex" : "inline-flex";
  return [display, base, variants[variant], heights[size], padding, full ? "w-full sm:w-auto" : ""].filter(Boolean).join(" ");
}

type Style = { variant?: ButtonVariant; size?: ButtonSize; full?: boolean; showFrom?: "sm" };

// `pending`: a spinner over the faded label, at the same width. `done`: a check, for the moment after it worked.
// `shortcut`: a key that already does what the button does ("Esc"), shown on it from sm up.
// Either way it can't be pressed again. SubmitButton and ActionButton set them; /design sets them by hand.
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & Style & { pending?: boolean; done?: boolean; shortcut?: "Esc" };

export function Button({ variant, size, full, showFrom, pending, done, shortcut, className = "", type = "submit", disabled, children, ...props }: ButtonProps) {
  const busy = pending || done;
  return (
    <button type={type} className={`${buttonClass({ variant, size, full, showFrom })} ${className}`} disabled={disabled || busy} aria-busy={busy || undefined} aria-keyshortcuts={shortcut ? "Escape" : undefined} {...props}>
      {pending === undefined && done === undefined ? (
        <>
          {children}
          {shortcut && <Kbd>{shortcut}</Kbd>}
        </>
      ) : (
        <>
          {/* Lays its children out as the button would; stays in place, unseen, so the width and the name hold */}
          <span className={`flex w-full min-w-0 [align-items:inherit] [justify-content:inherit] [gap:inherit] transition-opacity ${busy ? "opacity-0" : ""}`}>{children}</span>
          {busy && <span className="absolute inset-0 grid place-items-center">{done ? <CheckIcon /> : <Spinner />}</span>}
        </>
      )}
    </button>
  );
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
      className={`pressable grid h-[34px] w-[34px] shrink-0 place-items-center rounded-md text-ink2 hover:bg-chip hover:text-foreground ${className}`}
      {...props}
    />
  );
}
