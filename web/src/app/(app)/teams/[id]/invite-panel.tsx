import Link from "next/link";
import { withdrawInvite } from "@/app/actions";
import { knownRoles } from "@/lib/roles";
import { ROLE_SKILLS, type Candidate } from "@/lib/invites";
import { InviteButton } from "./invite-button";
import { Avatar, MonoLabel, SubmitButton } from "@/components/ui";

export type PendingInvite = { id: string; user_id: string; role: string; person: { name: string; avatar_url: string; open_to_collaborate: boolean } | null };

// Why someone is suggested for a role, in a few words
function why(role: string, c: Candidate) {
  // Only open people and your connections are suggested
  if (!c.open_to_collaborate) return "Your connection";
  const listed = knownRoles([role])[0];
  if (listed && c.wanted_roles.includes(listed)) return `Wants ${listed}`;
  const skills = c.skills.filter((s) => listed && ROLE_SKILLS[listed].includes(s));
  return skills.length > 0 ? `Has ${skills.slice(0, 2).join(", ")}` : c.headline;
}

// Under one of your team's open roles: who you've invited (with Withdraw), then up to 5 people who fill the role.
// `showRole`: the invites are for several roles (the ones filled meanwhile), so each says which.
export function InvitePanel({ teamId, role, invites, suggestions, showRole = false }: { teamId: string; role: string; invites: PendingInvite[]; suggestions: Candidate[]; showRole?: boolean }) {
  if (invites.length === 0 && suggestions.length === 0) {
    return <p className="text-meta text-muted sm:pl-4">Nobody to suggest for this role yet. People open to a team, and your connections, show up here to invite.</p>;
  }
  return (
    <div className="flex flex-col gap-3 pb-4 sm:pl-4">
      {invites.length > 0 && (
        <ul className="flex flex-col gap-2">
          {invites.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3">
              <Link href={`/u/${i.user_id}`} className="flex min-w-0 items-center gap-2 hover:text-accent">
                <Avatar url={i.person?.avatar_url ?? ""} name={i.person?.name ?? ""} size="sm" ring={i.person?.open_to_collaborate ? "open" : null} />
                <span className="truncate text-sm font-medium">{i.person?.name || "Unnamed"}</span>
                <span className="shrink-0 text-meta text-accent">{showRole ? `Invited as ${i.role}` : "Invited"}</span>
              </Link>
              <form action={withdrawInvite.bind(null, teamId, i.id)}>
                <SubmitButton variant="bare" aria-label={`Withdraw the invitation to ${i.person?.name || "Unnamed"}`} className="h-9 text-meta text-ink2 hover:text-foreground">Withdraw</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
      {suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <MonoLabel as="p" tone="muted">People who fill this role</MonoLabel>
          <ul className="flex flex-col gap-2">
            {suggestions.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3">
                <Link href={`/u/${c.id}`} className="flex min-w-0 items-center gap-2 hover:opacity-80">
                  <Avatar url={c.avatar_url} name={c.name} size="md" ring={c.open_to_collaborate ? "open" : null} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{c.name}</span>
                    {why(role, c) && <span className="block truncate text-meta text-ink2">{why(role, c)}</span>}
                  </span>
                </Link>
                <InviteButton teamId={teamId} personId={c.id} personName={c.name} role={role} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
