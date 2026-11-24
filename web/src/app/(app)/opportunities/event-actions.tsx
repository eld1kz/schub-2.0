import Link from "next/link";
import { enterTeam } from "@/app/actions";
import type { EnterableTeam, MyEntry } from "@/lib/teams";
import { EditDialog } from "../u/[id]/edit-dialog";
import { EntryStatusControl, EntryStatusLabel } from "../entry-status";
import { EnterTeamFields } from "./[id]/enter-team-fields";
import { FindTeamButton, LookingNote } from "./[id]/looking-panel";
import { buttonClass } from "@/components/ui";

type Props = {
  event: { id: string; title: string; url: string };
  userId: string;
  isGuest: boolean;
  // Your note, when you're looking for a team for it
  looking: { note: string } | null;
  entered: MyEntry | null;
  // Your teams that haven't entered it yet
  enterable: EnterableTeam[];
  // Over: nothing left to join or enter, only your team's status
  ended: boolean;
  // In a list row (featured events): the buttons only, and your team's status as a label
  compact?: boolean;
};

const login = (next: string) => `/login?next=${encodeURIComponent(next)}`;

// The three things to do about an event: find a team, create one, or enter one you have. Signed-out visitors get the
// same buttons, each going to sign-in and back. Once your team is entered, it shows instead of "Enter your team".
export function EventActions({ event, userId, isGuest, looking, entered, enterable, ended, compact = false }: Props) {
  const page = `/opportunities/${event.id}`;
  const create = `/teams/new?opportunity=${event.id}`;

  // On the event's page, once you're looking, your note takes a line of its own above the buttons
  const note = !isGuest && looking && !compact;
  const find = isGuest ? (
    <Link href={login(page)} className={buttonClass({ size: "sm" })}>Find a team</Link>
  ) : looking ? (
    compact && (
      <Link href={`${page}#teams`} className="flex h-9 items-center gap-2 text-sm font-semibold hover:text-accent">
        <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />
        You&apos;re looking for a team
      </Link>
    )
  ) : (
    <FindTeamButton opportunityId={event.id} onPage={!compact} />
  );

  const enter = isGuest ? (
    <Link href={login(page)} className={buttonClass({ variant: "secondary", size: "sm" })}>Enter your team</Link>
  ) : enterable.length > 0 ? (
    <EditDialog title={`Enter your team in ${event.title}`} trigger="action" label="Enter your team" submit="Enter team" done="Team entered" save={enterTeam.bind(null, event.id)} requireValid tall>
      <EnterTeamFields teams={enterable} />
    </EditDialog>
  ) : null;

  const yourTeam = entered && (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <p className="text-base">
        <span className="text-ink2">Your team:</span>{" "}
        <Link href={`/teams/${entered.teamId}`} className="font-semibold hover:text-accent">{entered.title}</Link>
        {(compact || !entered.owner) && <> · <EntryStatusLabel status={entered.status} /></>}
      </p>
      {!compact && entered.owner && <EntryStatusControl teamId={entered.teamId} teamTitle={entered.title} event={event} status={entered.status} userId={userId} />}
    </div>
  );

  if (ended && !entered) return null;
  return (
    <section
      aria-label={`What you can do about ${event.title}`}
      className={compact ? "relative z-10 flex flex-wrap items-center gap-x-2 gap-y-3" : "flex flex-col gap-4 border-y border-line2 py-4"}
    >
      {!ended && note && <LookingNote opportunityId={event.id} note={looking.note} />}
      {!ended && (
        <div className="flex flex-wrap items-center gap-2">
          {find}
          <Link href={isGuest ? login(create) : create} className={buttonClass({ variant: "secondary", size: "sm" })}>Create a team</Link>
          {!entered && enter}
        </div>
      )}
      {yourTeam}
    </section>
  );
}
