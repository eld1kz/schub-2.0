import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";

const links = [
  { href: "/opportunities", label: "Opportunities" },
  { href: "/teams", label: "Teams" },
  { href: "/people", label: "People" },
  { href: "/profile", label: "Profile" },
];

function Nav({ counts = {} }: { counts?: Record<string, number> }) {
  return (
    <nav className="flex items-center gap-4 text-sm sm:gap-5">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="text-muted hover:text-foreground">
          {l.label}
          {counts[l.href] > 0 && <span className="ml-1 font-medium text-foreground tabular-nums">{counts[l.href]}</span>}
        </Link>
      ))}
    </nav>
  );
}

// Things waiting on you: connection requests, and applications to your teams
async function NavWithCounts() {
  const { supabase, userId } = await requireUser();
  const [requests, applications] = await Promise.all([
    supabase.from("connections").select("id", { count: "exact", head: true }).eq("receiver_id", userId).eq("status", "pending"),
    // Pending applications you can see that aren't yours are the ones to your own teams
    supabase.from("team_applications").select("id", { count: "exact", head: true }).eq("status", "pending").neq("user_id", userId),
  ]);
  return <Nav counts={{ "/people": requests.count ?? 0, "/teams": applications.count ?? 0 }} />;
}

async function ProfileNudge() {
  const { supabase, userId } = await requireUser();
  const { data: me } = await supabase.from("profiles").select("name").eq("id", userId).maybeSingle();
  if (me?.name) return null;
  return (
    <Link href="/profile" className="mt-4 block rounded-md border border-border p-3 text-sm">
      <span className="font-medium">Finish your profile.</span>{" "}
      <span className="text-muted">Add your name and skills so people can find you and you get matched.</span>
    </Link>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border py-4">
        <Link href="/opportunities" className="font-semibold">Schub</Link>
        <Suspense fallback={<Nav />}><NavWithCounts /></Suspense>
      </header>
      <Suspense><ProfileNudge /></Suspense>
      <main className="py-8">{children}</main>
    </div>
  );
}
