"use client";

import { useState } from "react";
import { ROLES } from "@/lib/roles";
import type { EnterableTeam } from "@/lib/teams";
import { FieldError } from "../../u/[id]/edit-dialog";

const maxRoles = 10;

// Inside the "Enter your team" dialog: pick one of your teams, then adjust its open roles if you like. Roles someone
// was accepted for always stay. Every picked role is sent as a "roles" value.
export function EnterTeamFields({ teams }: { teams: EnterableTeam[] }) {
  const [chosen, setChosen] = useState(teams.length === 1 ? teams[0].id : "");
  const [picked, setPicked] = useState<Record<string, string[]>>(() => Object.fromEntries(teams.map((t) => [t.id, t.open])));
  const team = teams.find((t) => t.id === chosen);
  const roles = picked[chosen] ?? [];
  // The fixed list, plus any role an older team typed in itself
  const choices = team ? [...ROLES, ...team.open.filter((r) => !ROLES.includes(r))].filter((r) => !team.filled.includes(r)) : [];
  const toggle = (role: string) => setPicked({ ...picked, [chosen]: roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role] });

  return (
    <div className="flex flex-col gap-6 py-6">
      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium">Which team?</legend>
        <div className="flex flex-col border-t border-border">
          {teams.map((t) => (
            <label key={t.id} className="flex cursor-pointer items-center gap-3 border-b border-border py-3">
              <input type="radio" name="team_id" value={t.id} required checked={chosen === t.id} onChange={() => setChosen(t.id)} className="h-4 w-4 shrink-0 accent-[var(--accent)]" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-base font-semibold">{t.title}</span>
                <span className="text-sm text-ink2">{t.open.length > 0 ? `Needs: ${t.open.join(", ")}` : "All roles filled"}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError field="team_id" />
      </fieldset>

      {team && (
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium">
            Open roles for this event <span className="font-normal text-muted">(change them if you need to)</span>
          </legend>
          {roles.map((r) => <input key={r} type="hidden" name="roles" value={r} />)}
          <div className="flex flex-wrap gap-1.5">
            {choices.map((role) => {
              const on = roles.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(role)}
                  disabled={!on && roles.length + team.filled.length >= maxRoles}
                  className={`h-9 rounded-md border px-3 text-sm transition-colors disabled:opacity-40 ${on ? "border-accent bg-accent-soft font-medium text-accent" : "border-line2 text-ink2 hover:border-muted hover:text-foreground"}`}
                >
                  {role}
                </button>
              );
            })}
          </div>
          {team.filled.length > 0 && <p className="mt-2 text-meta text-muted">Filled, so they stay: {team.filled.join(", ")}</p>}
          <FieldError field="roles" />
          <p className="mt-4 text-meta text-ink2">Everyone on the team gets a notification that it entered.</p>
        </fieldset>
      )}
    </div>
  );
}
