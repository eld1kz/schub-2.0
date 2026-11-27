import type { ButtonHTMLAttributes, ReactNode } from "react";

// A flat chip (DESIGN.md). sm: a skill under an entry, in mono (the timeline's). md: a skill with where it's used.
export function Chip({ size = "sm", className = "", children }: { size?: "sm" | "md"; className?: string; children: ReactNode }) {
  const sizes = { sm: "px-1.5 py-0.5 font-mono text-xs", md: "px-2 py-1 text-base" };
  return <li className={`rounded-sm bg-chip ${sizes[size]} ${className}`}>{children}</li>;
}

// A row of chips
export function ChipList({ className = "", children }: { className?: string; children: ReactNode }) {
  return <ul className={`flex flex-wrap gap-1.5 ${className}`}>{children}</ul>;
}

// Picked or not: role pickers, language pickers and filters. On, it takes the accent.
export const toggleChipClass = (on: boolean) =>
  `inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm transition-colors disabled:opacity-40 ${on ? "border-accent bg-accent-soft font-medium text-accent" : "border-line2 text-ink2 hover:border-muted hover:text-foreground"}`;

export function ToggleChip({ on, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { on: boolean }) {
  return <button type="button" aria-pressed={on} className={`${toggleChipClass(on)} ${className}`} {...props} />;
}

// A checkbox drawn as a toggle chip, for forms that post the picked values
export function CheckChip({ name, value, defaultChecked, children }: { name: string; value: string; defaultChecked?: boolean; children: ReactNode }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center justify-center rounded-md border border-line2 px-2 py-2 text-center text-sm text-ink2 transition-colors hover:border-muted has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="sr-only" />
      {children}
    </label>
  );
}
