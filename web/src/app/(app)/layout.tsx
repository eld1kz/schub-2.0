import Link from "next/link";

const links = [
  { href: "/feed", label: "Feed" },
  { href: "/discover", label: "Discover" },
  { href: "/profile", label: "Profile" },
];

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <header className="flex items-center justify-between border-b border-border py-4">
        <Link href="/feed" className="font-semibold">Schub</Link>
        <nav className="flex items-center gap-5 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted hover:text-foreground">{l.label}</Link>
          ))}
        </nav>
      </header>
      <main className="py-8">{children}</main>
    </div>
  );
}
