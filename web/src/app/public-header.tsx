import type { ReactNode } from "react";
import Link from "next/link";

// Top bar for pages outside the app (landing, /login): the logo, and whatever goes on the right
export function PublicHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-[60px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-12">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-[-0.03em]">
          <span aria-hidden className="h-3 w-3 rounded-[2px] bg-accent" />
          schub
        </Link>
        {children}
      </div>
    </header>
  );
}
