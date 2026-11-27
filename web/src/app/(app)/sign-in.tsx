"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { buttonClass } from "@/components/ui";

// Goes to /login, which brings people back to this page after they sign in
export function SignInButton({ label = "Sign in", className = buttonClass() }: { label?: string; className?: string }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const next = pathname + (search ? `?${search}` : "");
  return <Link href={`/login?next=${encodeURIComponent(next)}`} className={className}>{label}</Link>;
}

// Shown in place of a form guests can't use
export function SignInPrompt({ text }: { text: string }) {
  return (
    <div className="max-w-phone space-y-3 rounded-md border border-border p-4">
      <p className="text-sm">{text}</p>
      <SignInButton />
    </div>
  );
}
