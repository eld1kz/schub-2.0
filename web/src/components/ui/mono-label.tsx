import type { ReactNode } from "react";

// A small uppercase mono label: an opportunity's type, a team's status in an event, a placement, a skill group
// `as` "p" when it stands on a line of its own
export function MonoLabel({ tone = "ink2", as: Tag = "span", className = "", children }: { tone?: "ink2" | "muted" | "accent"; as?: "span" | "p"; className?: string; children: ReactNode }) {
  const tones = { ink2: "text-ink2", muted: "text-muted", accent: "text-accent" };
  return <Tag className={`font-mono text-xs font-medium tracking-wide uppercase ${tones[tone]} ${className}`}>{children}</Tag>;
}
