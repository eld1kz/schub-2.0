import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { awardedIds } from "@/lib/awards";
import { ConnectionList, type ConnectionItem } from "./connection-list";

type Person = { name: string; headline: string; avatar_url: string; open_to_collaborate: boolean } | null;
type Connection = { sender_id: string; receiver_id: string; sender: Person; receiver: Person };

export const instant = false;

// Everyone you're connected with, A to Z, with their contact details since you're connected
export default async function ConnectionsPage() {
  const { supabase, userId } = await requireUser();
  const [{ data }, awarded] = await Promise.all([
    supabase
      .from("connections")
      .select("sender_id, receiver_id, sender:profiles!sender_id(name, headline, avatar_url, open_to_collaborate), receiver:profiles!receiver_id(name, headline, avatar_url, open_to_collaborate)")
      .eq("status", "accepted"),
    awardedIds(supabase),
  ]);
  const others = ((data ?? []) as unknown as Connection[]).map((c) => {
    const sentByMe = c.sender_id === userId;
    const person = sentByMe ? c.receiver : c.sender;
    return { id: sentByMe ? c.receiver_id : c.sender_id, name: person?.name ?? "", headline: person?.headline ?? "", avatar_url: person?.avatar_url ?? "", open: person?.open_to_collaborate ?? false };
  });

  // Telegram and email are only readable through contact_for, which checks the connection is accepted
  const contacts = await Promise.all(others.map((p) => supabase.rpc("contact_for", { profile_id: p.id })));
  const people: ConnectionItem[] = others
    .map((p, i) => {
      const contact = (contacts[i].data as { telegram: string; email: string }[] | null)?.[0];
      return { ...p, telegram: contact?.telegram ?? "", email: contact?.email ?? "", awarded: awarded.has(p.id) };
    })
    .sort((a, b) => (a.name || "Unnamed").localeCompare(b.name || "Unnamed"));

  if (people.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 py-2">
        <p className="text-base font-medium">No connections yet</p>
        <Link href="/people" className="text-sm font-semibold text-accent hover:underline">Find people on Discover</Link>
      </div>
    );
  }

  return <ConnectionList people={people} />;
}
