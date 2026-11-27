import type { LucideIcon } from "lucide-react";

// Every icon is a Lucide one, drawn here so they share one size (16px) and one stroke (DESIGN.md). Decorative:
// whatever it sits in says what it means.
export function Icon({ icon: Glyph, className = "" }: { icon: LucideIcon; className?: string }) {
  return <Glyph aria-hidden size={16} strokeWidth={1.5} className={`shrink-0 ${className}`} />;
}
