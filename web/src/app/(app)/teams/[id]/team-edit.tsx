import { updateTeam } from "@/app/actions";
import { LANGUAGES, WORK_MODES, workModeLabel } from "@/lib/languages";
import { openRoles } from "@/lib/teams";
import { CheckChip, Combobox, FieldLabel, Input, Textarea } from "@/components/ui";
import { EditDialog, FieldError } from "../../u/[id]/edit-dialog";
import { RoleFields } from "../new/role-fields";
import type { Application, Team } from "./team-view";

// The owner's edit modal for the team, like the profile's section modals
export function TeamEdit({ team: t, applications }: { team: Team; applications: Application[] }) {
  const open = openRoles({ roles: t.roles, team_applications: applications });
  return (
    <EditDialog title="Edit team" trigger="edit" label="Edit team" note="Removing a role declines its pending applications and invitations" save={updateTeam.bind(null, t.id)} tall>
      <div className="space-y-4 py-6">
        <div>
          <FieldLabel htmlFor="title" required>What are you building?</FieldLabel>
          <Input id="title" name="title" defaultValue={t.title} required minLength={3} maxLength={120} />
          <FieldError field="title" />
        </div>
        <div>
          <FieldLabel htmlFor="description" optional>More about it</FieldLabel>
          <Textarea id="description" name="description" rows={4} defaultValue={t.description} maxLength={2000} />
        </div>
        <div>
          <RoleFields initial={{ roles: t.roles, notes: t.role_notes }} locked={t.roles.filter((r) => !open.includes(r))} />
          <FieldError field="roles" />
        </div>
        <fieldset>
          <FieldLabel as="legend" optional="optional, one or more">Team language</FieldLabel>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {LANGUAGES.map((l) => (
              <CheckChip key={l} name="languages" value={l} defaultChecked={t.languages.includes(l)}>{l}</CheckChip>
            ))}
          </div>
        </fieldset>
        <div>
          <FieldLabel as="span">How you&apos;ll work</FieldLabel>
          <Combobox name="work_mode" label="How you'll work" defaultValue={t.work_mode} placeholder="Not decided" required={false} options={WORK_MODES.map((m) => ({ value: m, label: workModeLabel(m) }))} />
        </div>
      </div>
    </EditDialog>
  );
}
