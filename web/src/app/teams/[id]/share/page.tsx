import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { storyVersion } from "@/lib/story";
import { entryColumns, withCurrentEvent, type Entry } from "@/lib/teams";
import { today } from "@/lib/opportunities";
import { ShareOnPhone } from "../../../(app)/share-team";

// Opened on a phone from the QR code in the share dialog: the story image and a Share button, nothing else.
// Outside the (app) group, so there's no top bar or tab bar around it.
export const instant = false;

export default async function ShareTeamPage(props: PageProps<"/teams/[id]/share">) {
  const [{ id }, params] = await Promise.all([props.params, props.searchParams]);
  const { supabase } = await requireUser();
  const { data } = await supabase.from("teams").select(`id, title, roles, owner_id, team_entries(${entryColumns}), team_applications(user_id, role, status)`).eq("id", id).maybeSingle();
  if (!data) notFound();
  // Versioned by the team's current event, like the image itself
  const team = withCurrentEvent(data as unknown as Omit<Parameters<typeof storyVersion>[0], "opportunity"> & { id: string; team_entries: Entry[] }, today());

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-5 px-4 py-6">
      <h1 className="text-center text-lg font-semibold">{team.title}</h1>
      <ShareOnPhone teamId={team.id} title={team.title} version={storyVersion(team)} initialTheme={params.theme === "dark" ? "dark" : "light"} />
    </main>
  );
}
