import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { AdminShell } from "../admin-shell";
import { Button, EmptyState, Input, SectionTitle } from "@/components/ui";

export const instant = false;

type Person = { id: string; name: string; headline: string; university: string; hidden_at: string | null };

// % and _ are wildcards in ilike; match them literally
const containing = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

// Search people by name; each opens their activity summary
export default async function AdminPeoplePage(props: PageProps<"/admin/people">) {
  const { supabase } = await requireAdmin("/admin/people");
  const { q: param } = await props.searchParams;
  const q = typeof param === "string" ? param.trim().slice(0, 50) : "";
  const [{ data }, { data: suspended }] = await Promise.all([
    q.length >= 2 ? supabase.from("profiles").select("id, name, headline, university, hidden_at").ilike("name", containing(q)).order("name").limit(50) : { data: [] },
    supabase.from("suspensions").select("user_id"),
  ]);
  const people = (data ?? []) as Person[];
  const isSuspended = new Set((suspended ?? []).map((s) => s.user_id));

  return (
    <AdminShell>
      <form className="flex max-w-dialog gap-2 pb-6" role="search">
        <label htmlFor="admin-people-q" className="sr-only">Name</label>
        <Input id="admin-people-q" name="q" search defaultValue={q} placeholder="Search by name" minLength={2} />
        <Button variant="secondary">Search</Button>
      </form>
      {q.length >= 2 && (
        <>
          <SectionTitle title="People" count={people.length} />
          {people.length === 0 ? (
            <EmptyState>Nobody by that name.</EmptyState>
          ) : (
            <ul>
              {people.map((p) => (
                <li key={p.id} className="border-b border-border">
                  <Link href={`/admin/people/${p.id}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 hover:text-accent">
                    <span className="text-base font-semibold">{p.name || "Unnamed"}</span>
                    <span className="text-sm text-ink2">{[p.headline, p.university].filter(Boolean).join(" · ")}</span>
                    {p.hidden_at && <span className="text-sm text-ink2">Hidden</span>}
                    {isSuspended.has(p.id) && <span className="text-sm text-danger">Suspended</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </AdminShell>
  );
}
