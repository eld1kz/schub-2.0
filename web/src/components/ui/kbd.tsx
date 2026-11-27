import type { ReactNode } from "react";

// A key that does what its button does. Decorative (the button says so with aria-keyshortcuts), and only from sm
// up: phones have no keyboard.
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd aria-hidden className="hidden rounded-sm border border-current/30 px-1 font-mono text-xs font-normal sm:inline">{children}</kbd>;
}
