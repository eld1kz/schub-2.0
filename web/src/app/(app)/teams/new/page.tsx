import { requireUser } from "@/lib/supabase/server";
import { createTeam } from "@/app/actions";
import { today } from "@/lib/opportunities";
import { SignInPrompt } from "../../sign-in";
import { RoleFields } from "./role-fields";
import { LANGUAGES, WORK_MODES } from "@/lib/languages";
import { CheckChip, ErrorText, FieldLabel, Input, PageHeader, Select, Textarea, buttonClass } from "@/components/ui";

export const instant = false;


export default async function NewTeamPage(props: PageProps<"/teams/new">) {
  const { error, opportunity } = await props.searchParams;
  const { supabase, isGuest } = await requireUser();
  if (isGuest) return <SignInPrompt text="Sign in to post a team." />;
  const day = today();
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, title")
    .eq("status", "live")
    // Admins can read imports waiting for review; they aren't events to enter yet
    .eq("needs_review", false)
    .or(`deadline.gte.${day},starts_at.gte.${day},and(deadline.is.null,starts_at.is.null)`)
    .order("title");

  return (
    <form action={createTeam} className="max-w-form">
      <PageHeader title="Post a team" description={<>Say what you&apos;re building and which roles you still need. People apply; you accept or decline.</>} ruled className="pb-6" />

      <div className="space-y-4 py-6">
        <div>
          <FieldLabel htmlFor="title" required>What are you building?</FieldLabel>
          <Input id="title" name="title" required minLength={3} maxLength={120} placeholder="AI study buddy for university students" />
        </div>
        <div>
          <FieldLabel htmlFor="description" optional>More about it</FieldLabel>
          <Textarea id="description" name="description" rows={4} maxLength={2000} placeholder="One or two lines on the idea and where it's at." />
        </div>
        <RoleFields />
        <fieldset>
          <FieldLabel as="legend" optional="optional, one or more">Team language</FieldLabel>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {LANGUAGES.map((l) => (
              <CheckChip key={l} name="languages" value={l}>{l}</CheckChip>
            ))}
          </div>
        </fieldset>
        <div>
          <FieldLabel htmlFor="work_mode" optional>How you&apos;ll work</FieldLabel>
          <Select id="work_mode" name="work_mode" defaultValue="" placeholder="Not decided" required={false} options={WORK_MODES.map((m) => ({ value: m, label: m }))} />
        </div>
        <div>
          <FieldLabel htmlFor="opportunity_id" optional>For an opportunity</FieldLabel>
          <Select id="opportunity_id" name="opportunity_id" defaultValue={typeof opportunity === "string" ? opportunity : ""} placeholder="Not tied to one" required={false} options={(opportunities ?? []).map((o) => ({ value: o.id, label: o.title }))} />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row-reverse sm:items-center sm:justify-between">
        <button className={buttonClass({ size: "touch", full: true })}>Post team</button>
        {typeof error === "string" && <ErrorText size="sm">{error}</ErrorText>}
      </div>
    </form>
  );
}
