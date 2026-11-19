import Link from "next/link";
import { openRoles } from "@/lib/teams";
import { knownSkills } from "@/lib/skills";
import { applyToTeam, deleteTeam, respondToApplication, withdrawApplication } from "@/app/actions";
import { Avatar } from "../../avatar";
import { SignInButton } from "../../sign-in";
import { EditDialog } from "../../u/[id]/edit-dialog";
import { Section } from "../../u/[id]/profile-parts";
import { ToastProvider } from "../../u/[id]/toast";
import { ShareTeamButton } from "../../share-team";

type Person = { name: string; headline: string; university: string; skills: string[]; avatar_url: string } | null;
export type Application = {
  id: string;
  user_id: string;
  role: string;
  note: string;
  status: "pending" | "accepted" | "declined";
  person: Person;
};

const row = "flex flex-col gap-3 border-b border-border py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6";

function PersonLink({ id, person, you }: { id: string; person: { name: string; avatar_url: string } | null; you: boolean }) {
  return (
    <Link href={`/u/${id}`} className="flex min-w-0 items-center gap-2.5 hover:text-accent">
      <Avatar url={person?.avatar_url ?? ""} name={person?.name ?? ""} className="h-8 w-8 text-[11px]" sizes="32px" />
      <span className="truncate text-[15px] font-medium">{you ? "You" : person?.name || "Unnamed"}</span>
    </Link>
  );
}

// A team member in the spotlight: photo, name, headline and role. Your connections get the accent ring and a label.
function Member({ id, person, role, you, connection }: { id: string; person: { name: string; headline: string; avatar_url: string } | null; role: string; you: boolean; connection: boolean }) {
  return (
    <article className="flex items-start gap-3.5 border-b border-border py-4 first:pt-0">
      <Link href={`/u/${id}`} aria-hidden tabIndex={-1} className="shrink-0">
        <Avatar
          url={person?.avatar_url ?? ""}
          name={person?.name ?? ""}
          className={`h-11 w-11 text-sm ${connection ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""}`}
          sizes="44px"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <Link href={`/u/${id}`} className="text-base font-semibold hover:text-accent">{you ? "You" : person?.name || "Unnamed"}</Link>
          {connection && <span className="text-[13px] font-medium text-accent">Your connection</span>}
        </div>
        {person?.headline && <p className="text-sm leading-snug text-ink2">{person.headline}</p>}
      </div>
      <span className="shrink-0 pt-0.5 text-sm text-ink2">{role}</span>
    </article>
  );
}

function ApplyButton({ teamId, teamTitle, role }: { teamId: string; teamTitle: string; role: string }) {
  return (
    <EditDialog
      title={`Apply for ${role}`}
      trigger="action"
      label={`Apply for ${role}`}
      cta="Apply for this role"
      submit="Send application"
      done="Application sent"
      save={applyToTeam.bind(null, teamId)}
      tall
    >
      <div className="space-y-5 py-6">
        <input type="hidden" name="role" value={role} />
        <p className="text-[15px] text-ink2">
          You&apos;re applying to <span className="font-semibold text-foreground">{teamTitle}</span> as <span className="font-semibold text-foreground">{role}</span>. The owner sees your profile and this note.
        </p>
        <div>
          <label htmlFor={`note-${role}`} className="mb-1.5 block text-sm font-medium">
            Why you <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea id={`note-${role}`} name="note" rows={4} maxLength={300} placeholder="Built two React apps, free every evening" className="input resize-none leading-normal" />
          <p className="mt-1 text-[13px] text-muted">Up to 300 characters</p>
        </div>
      </div>
    </EditDialog>
  );
}

export type Team = {
  id: string;
  title: string;
  description: string;
  roles: string[];
  owner_id: string;
  owner: { name: string; avatar_url: string; headline: string } | null;
  opportunity: { id: string; title: string } | null;
};

// The team page for whoever is looking: open roles to apply for, the team, and applicants for the owner
// `connections`: your accepted connections, marked among the members; empty when signed out
// `shareVersion`: storyVersion of the team, for the share image's address
export function TeamView({ team: t, applications, userId, isGuest, connections, shareVersion }: { team: Team; applications: Application[]; userId: string; isGuest: boolean; connections: Set<string>; shareVersion: string }) {
  const { owner, opportunity } = t;
  const roles = t.roles;
  const isOwner = t.owner_id === userId;
  const mine = applications.find((a) => a.user_id === userId);
  const members = applications.filter((a) => a.status === "accepted");
  const pending = applications.filter((a) => a.status === "pending" && a.user_id !== userId);
  const open = openRoles({ roles, team_applications: applications });
  // Applicants grouped by the role they applied for, in the team's order
  const byRole = roles.map((role) => ({ role, people: pending.filter((a) => a.role === role) })).filter((g) => g.people.length > 0);

  const teamId = t.id;
  const teamTitle = t.title;

  // What sits at the right of an open role: apply, your application, or who's waiting
  function openRoleAction(role: string) {
    if (isOwner) {
      const waiting = pending.filter((a) => a.role === role).length;
      return <span className="text-sm text-ink2">{waiting > 0 ? `${waiting} ${waiting === 1 ? "applicant" : "applicants"}` : "No applicants yet"}</span>;
    }
    if (isGuest) return <SignInButton label="Sign in to apply" className="btn-outline h-9" />;
    if (mine?.role === role && mine.status === "pending") {
      return (
        <span className="flex items-center gap-4">
          <span className="text-sm font-medium text-accent">You applied</span>
          <form action={withdrawApplication.bind(null, teamId)}><button className="text-sm text-ink2 hover:text-foreground">Withdraw</button></form>
        </span>
      );
    }
    if (mine?.role === role && mine.status === "declined") return <span className="text-sm text-muted">Not accepted</span>;
    // One application per team
    if (mine) return null;
    return <ApplyButton teamId={teamId} teamTitle={teamTitle} role={role} />;
  }

  return (
    <ToastProvider>
      <div className="max-w-[752px]">
        <header className="flex flex-col gap-3 pb-8 sm:pb-10">
          {opportunity && (
            <p className="text-sm text-ink2">
              For <Link href={`/opportunities/${opportunity.id}`} className="font-medium text-accent hover:underline">{opportunity.title}</Link>
            </p>
          )}
          <h1 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] sm:text-4xl sm:tracking-[-0.03em]">{t.title}</h1>
          {t.description && <p className="max-w-[620px] text-[15px] leading-relaxed text-pretty whitespace-pre-wrap sm:text-base">{t.description}</p>}
          <div className="mt-1 flex items-center gap-2 text-sm text-ink2">
            Started by
            <Link href={`/u/${t.owner_id}`} className="flex items-center gap-2 font-medium text-foreground hover:text-accent">
              <Avatar url={owner?.avatar_url ?? ""} name={owner?.name ?? ""} className="h-6 w-6 text-[10px]" sizes="24px" />
              {isOwner ? "you" : owner?.name || "Unnamed"}
            </Link>
          </div>
          {/* Everyone can share a team; for its owner it's the main thing to do here */}
          <div className="mt-2">
            <ShareTeamButton teamId={t.id} title={t.title} version={shareVersion} variant={isOwner ? "primary" : "outline"} />
          </div>
          {mine?.status === "accepted" && (
            <p className="mt-2 text-sm">
              <span className="font-semibold">You&apos;re on this team as {mine.role}.</span>{" "}
              <Link href={`/u/${t.owner_id}`} className="font-medium text-accent hover:underline">See how to reach {owner?.name || "the owner"}</Link>
            </p>
          )}
        </header>

        <Section title="Open roles" count={open.length}>
          {open.length > 0 ? (
            <div className="flex flex-col">
              {open.map((role) => (
                <div key={role} className={row}>
                  <span className="text-[17px] font-semibold">{role}</span>
                  {openRoleAction(role)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[15px] text-ink2">All roles are filled.</p>
          )}
        </Section>

        <Section title="Team">
          <div className="flex flex-col">
            <Member id={t.owner_id} person={owner} role="Started it" you={isOwner} connection={connections.has(t.owner_id)} />
            {members.map((m) => (
              <Member key={m.id} id={m.user_id} person={m.person} role={m.role} you={m.user_id === userId} connection={connections.has(m.user_id)} />
            ))}
          </div>
        </Section>

        {isOwner && (
          <Section id="applications" title="Applications" count={pending.length}>
            {byRole.length === 0 ? (
              <p className="text-[15px] text-ink2">Nobody has applied yet. People see your open roles on the Teams page.</p>
            ) : (
              <div className="flex flex-col gap-8">
                {byRole.map((g) => (
                  <div key={g.role}>
                    <h3 className="border-b border-line2 pb-2 text-sm font-semibold">
                      {g.role} <span className="font-normal text-muted">{g.people.length}</span>
                    </h3>
                    {g.people.map((a) => (
                      <article key={a.id} className="flex flex-col gap-3 border-b border-border py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div className="flex min-w-0 flex-col gap-1.5">
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <PersonLink id={a.user_id} person={a.person} you={false} />
                            {a.person?.university && <span className="text-sm text-ink2">{a.person.university}</span>}
                          </div>
                          {a.note && <p className="max-w-[520px] text-[15px] leading-normal">{a.note}</p>}
                          {knownSkills(a.person?.skills ?? []).length > 0 && (
                            <ul className="flex flex-wrap gap-1.5">
                              {knownSkills(a.person?.skills ?? []).slice(0, 6).map((s) => <li key={s} className="skill px-1.5 text-xs">{s}</li>)}
                            </ul>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <form action={respondToApplication.bind(null, t.id, a.id, "accepted")}><button className="btn h-9 px-4">Accept</button></form>
                          <form action={respondToApplication.bind(null, t.id, a.id, "declined")}><button className="btn-outline h-9">Decline</button></form>
                        </div>
                      </article>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {isOwner && (
          <form action={deleteTeam.bind(null, t.id)} className="border-t border-line2 pt-6">
            <button className="text-sm text-ink2 hover:text-red-600 dark:hover:text-red-400">Delete team</button>
          </form>
        )}
      </div>
    </ToastProvider>
  );
}
