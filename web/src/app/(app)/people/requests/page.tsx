import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { respond, withdrawRequest } from "@/app/actions";
import { awardedIds } from "@/lib/awards";
import { PersonRow } from "../person-row";

type Person = { name: string; headline: string; avatar_url: string; open_to_collaborate: boolean } | null;
type Request = { id: string; sender_id: string; receiver_id: string; created_at: string; sender: Person; receiver: Person };

export const instant = false;

const sent = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function Heading({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="mb-4 text-[15px] font-semibold">
      {title} <span className="font-normal text-muted">{count}</span>
    </h2>
  );
}

// Pending requests: the ones waiting on you, and the ones you sent. Accepting moves the person to Connections.
export default async function RequestsPage() {
  const { supabase, userId } = await requireUser();
  const [{ data }, awarded] = await Promise.all([
    supabase
      .from("connections")
      .select("id, sender_id, receiver_id, created_at, sender:profiles!sender_id(name, headline, avatar_url, open_to_collaborate), receiver:profiles!receiver_id(name, headline, avatar_url, open_to_collaborate)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    awardedIds(supabase),
  ]);
  const pending = (data ?? []) as unknown as Request[];
  const received = pending.filter((c) => c.receiver_id === userId);
  const sentByMe = pending.filter((c) => c.sender_id === userId);

  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 py-2">
        <p className="text-[15px] font-medium">No pending requests</p>
        <Link href="/people" className="text-sm font-semibold text-accent hover:underline">Find people on Discover</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <Heading title="Received" count={received.length} />
        {received.length === 0 ? (
          <p className="text-sm text-ink2">Nothing waiting on you.</p>
        ) : (
          received.map((c) => (
            <PersonRow
              key={c.id}
              id={c.sender_id}
              name={c.sender?.name ?? ""}
              headline={c.sender?.headline ?? ""}
              avatarUrl={c.sender?.avatar_url ?? ""}
              open={c.sender?.open_to_collaborate}
              awarded={awarded.has(c.sender_id)}
              actions={
                <>
                  <form action={respond.bind(null, c.id, "accepted")}><button className="btn h-9 px-4">Accept</button></form>
                  <form action={respond.bind(null, c.id, "declined")}><button className="btn-outline h-9">Decline</button></form>
                </>
              }
            >
              <p className="text-[13px] text-muted">Sent {sent(c.created_at)}</p>
            </PersonRow>
          ))
        )}
      </section>

      <section>
        <Heading title="Sent" count={sentByMe.length} />
        {sentByMe.length === 0 ? (
          <p className="text-sm text-ink2">No requests waiting on others.</p>
        ) : (
          sentByMe.map((c) => (
            <PersonRow
              key={c.id}
              id={c.receiver_id}
              name={c.receiver?.name ?? ""}
              headline={c.receiver?.headline ?? ""}
              avatarUrl={c.receiver?.avatar_url ?? ""}
              open={c.receiver?.open_to_collaborate}
              awarded={awarded.has(c.receiver_id)}
              actions={<form action={withdrawRequest.bind(null, c.id)}><button className="h-9 text-sm text-ink2 hover:text-foreground">Withdraw</button></form>}
            >
              <p className="text-[13px] text-muted">Sent {sent(c.created_at)} · waiting for a reply</p>
            </PersonRow>
          ))
        )}
      </section>
    </div>
  );
}
