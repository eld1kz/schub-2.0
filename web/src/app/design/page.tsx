import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Sheet } from "./sheet";

export const metadata: Metadata = { title: "Design system", robots: { index: false } };

// /design, in development only and linked from nowhere: every component in src/components/ui in every state, light
// and dark side by side (each side sets its color scheme, which the light-dark() tokens in globals.css follow)
export default function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto max-w-wide">
      <header className="flex flex-col gap-1.5 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold sm:text-3xl">Design system</h1>
        <p className="text-base text-ink2">Tokens from globals.css, components from src/components/ui. DESIGN.md says when to use which.</p>
      </header>
      <div className="grid xl:grid-cols-2">
        <Sheet scheme="light" />
        <Sheet scheme="dark" />
      </div>
    </main>
  );
}
