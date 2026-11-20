import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { Avatar } from "./avatar";
import { SignInButton } from "./sign-in";
import { Notifications, type Notification } from "./notifications";
import { GlobalSearch } from "./global-search";
import { NavTabs, TabBar } from "./nav-tabs";
import { AccountMenu } from "./account-menu";

function Header({ counts = {}, profileHref = "/profile", account }: { counts?: Record<string, number>; profileHref?: string; account?: ReactNode }) {
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex h-[60px] max-w-[1440px] items-center gap-4 px-4 sm:gap-11 sm:px-12">
          <Link href="/opportunities" className="flex items-center gap-2 text-xl font-bold tracking-[-0.03em]">
            <span aria-hidden className="h-3 w-3 rounded-[2px] bg-accent" />
            schub
          </Link>
          <NavTabs counts={counts} />
          <span className="flex-1" />
          <GlobalSearch />
          {account}
        </div>
      </header>
      <TabBar counts={counts} profileHref={profileHref} />
    </>
  );
}

const menuItem = "block px-4 py-2 text-foreground hover:bg-foreground/5";

// Things waiting on you: connection requests, and applications to your teams. Guests get a sign-in button.
async function NavWithCounts() {
  const { supabase, userId, isGuest } = await requireUser();
  if (isGuest) return <Header account={<SignInButton label="Sign in" />} />;
  const [requests, applications, me, notifications, unread] = await Promise.all([
    supabase.from("connections").select("id", { count: "exact", head: true }).eq("receiver_id", userId).eq("status", "pending"),
    // Pending applications you can see that aren't yours are the ones to your own teams
    supabase.from("team_applications").select("id", { count: "exact", head: true }).eq("status", "pending").neq("user_id", userId),
    supabase.from("profiles").select("name, avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("notifications").select("id, message, read, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("read", false),
  ]);
  const name = me.data?.name ?? "";
  const account = (
    <span className="flex items-center gap-4 text-sm">
      <Notifications items={(notifications.data ?? []) as Notification[]} unread={(unread.count ?? 0) > 0} />
      <AccountMenu avatar={<Avatar url={me.data?.avatar_url ?? ""} name={name} className="h-8 w-8 text-xs" sizes="32px" />}>
        <Link href={`/u/${userId}`} className={menuItem}>Your profile</Link>
        <Link href="/settings" className={menuItem}>Settings</Link>
        <form action={signOut} className="border-t border-border pt-1 mt-1"><button className={`${menuItem} w-full text-left`}>Sign out</button></form>
      </AccountMenu>
    </span>
  );
  return <Header counts={{ "/people": requests.count ?? 0, "/teams": applications.count ?? 0 }} profileHref={`/u/${userId}`} account={account} />;
}

async function ProfileNudge() {
  const { supabase, userId, isGuest } = await requireUser();
  if (isGuest) return null;
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
    <>
      <Suspense fallback={<Header />}><NavWithCounts /></Suspense>
      <div className="mx-auto max-w-[1176px] px-4 sm:px-6">
        <Suspense><ProfileNudge /></Suspense>
        {/* Room at the bottom for the phone tab bar */}
        <main className="pt-8 pb-28 sm:pt-12 sm:pb-24">{children}</main>
      </div>
    </>
  );
}
