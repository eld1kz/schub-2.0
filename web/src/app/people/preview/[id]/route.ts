import { requireUser } from "@/lib/supabase/server";
import { knownSkills } from "@/lib/skills";

export type PersonPreview = {
  name: string;
  headline: string;
  avatar_url: string;
  open_to_collaborate: boolean;
  skills: string[];
  // Your connection with them, if any
  status: string | null;
  self: boolean;
  guest: boolean;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// What a hover card shows (person-link.tsx). A GET of its own rather than a server action, which would queue behind
// and ahead of the page's other actions. Public profile columns only, never contact details.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.test(id)) return new Response(null, { status: 404 });
  const { supabase, userId, isGuest } = await requireUser();
  const [{ data: person }, connection] = await Promise.all([
    supabase.from("profiles").select("name, headline, avatar_url, open_to_collaborate, skills, hidden_at").eq("id", id).maybeSingle(),
    isGuest
      ? null
      : supabase.from("connections").select("status").or(`and(sender_id.eq.${userId},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${userId})`).maybeSingle(),
  ]);
  // Hidden by an admin (supabase/admin.sql): no card for anyone else, as their profile page is not found
  if (!person || (person.hidden_at && id !== userId)) return new Response(null, { status: 404 });
  const preview: PersonPreview = {
    name: person.name,
    headline: person.headline,
    avatar_url: person.avatar_url,
    open_to_collaborate: person.open_to_collaborate,
    skills: knownSkills(person.skills ?? []).slice(0, 3),
    status: connection?.data?.status ?? null,
    self: id === userId,
    guest: isGuest,
  };
  return Response.json(preview, { headers: { "Cache-Control": "private, no-store" } });
}
