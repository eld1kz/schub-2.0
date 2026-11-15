import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { ConnectButton } from "../../connect-button";

export default async function UserPage(props: PageProps<"/u/[id]">) {
  const { id } = await props.params;
  const { supabase, userId } = await requireUser();
  const [profile, ideas, connection, contacts] = await Promise.all([
    supabase.from("profiles").select("name, university, graduation_year, bio, skills, interests, open_to_collaborate").eq("id", id).maybeSingle(),
    supabase.from("ideas").select("id, title, description, skills_needed, stage").eq("author_id", id).order("created_at", { ascending: false }),
    supabase.from("connections").select("status").or(`sender_id.eq.${id},receiver_id.eq.${id}`).maybeSingle(),
    // Returns a row only when the connection is accepted; never shown on your own page
    id === userId ? { data: null } : supabase.rpc("contact_for", { profile_id: id }),
  ]);
  const p = profile.data;
  if (!p) notFound();
  const contact = (contacts.data as { telegram: string; email: string }[] | null)?.[0];

  return (
    <div className="space-y-10">
      <section className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">{p.name || "Unnamed"}</h1>
          <p className="text-sm text-muted">
            {[p.university, p.graduation_year ? `Class of ${p.graduation_year}` : ""].filter(Boolean).join(" · ") || "—"}
          </p>
          {!p.open_to_collaborate && <p className="mt-1 text-xs text-muted">Not looking for collaborators</p>}
        </div>
        {id === userId ? (
          <Link href="/profile" className="btn-outline">Edit profile</Link>
        ) : (
          <ConnectButton profileId={id} status={connection.data?.status} />
        )}
      </section>

      {contact && (
        <section className="rounded-md border border-border p-4 text-sm">
          <h2 className="mb-2 font-medium">Contact</h2>
          {!contact.telegram && !contact.email && <p className="text-muted">No contact details added yet.</p>}
          <dl className="space-y-1">
            {contact.telegram && (
              <div className="flex gap-2"><dt className="text-muted">Telegram</dt><dd><a href={`https://t.me/${encodeURIComponent(contact.telegram)}`} target="_blank" rel="noreferrer" className="underline">@{contact.telegram}</a></dd></div>
            )}
            {contact.email && (
              <div className="flex gap-2"><dt className="text-muted">Email</dt><dd><a href={`mailto:${contact.email}`} className="break-all underline">{contact.email}</a></dd></div>
            )}
          </dl>
        </section>
      )}

      {p.bio && <p className="whitespace-pre-wrap">{p.bio}</p>}

      <dl className="space-y-3 text-sm">
        <div><dt className="text-muted">Skills</dt><dd>{p.skills.join(", ") || "—"}</dd></div>
        <div><dt className="text-muted">Interests</dt><dd>{p.interests.join(", ") || "—"}</dd></div>
      </dl>

      <section>
        <h2 className="mb-1 text-sm font-medium">Ideas</h2>
        <div className="divide-y divide-border border-t border-border">
          {(ideas.data ?? []).length === 0 && <p className="py-4 text-sm text-muted">No ideas yet.</p>}
          {(ideas.data ?? []).map((idea) => (
            <article key={idea.id} className="py-4">
              <p className="font-medium">{idea.title} <span className="ml-1 text-xs font-normal text-muted uppercase">{idea.stage}</span></p>
              {idea.description && <p className="mt-1 whitespace-pre-wrap text-sm">{idea.description}</p>}
              {idea.skills_needed.length > 0 && <p className="mt-2 text-sm text-muted">Needs: {idea.skills_needed.join(", ")}</p>}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
