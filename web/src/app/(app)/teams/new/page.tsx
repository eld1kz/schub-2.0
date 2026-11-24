import { requireUser } from "@/lib/supabase/server";
import { createTeam } from "@/app/actions";
import { today } from "@/lib/opportunities";
import { SignInPrompt } from "../../sign-in";
import { RoleFields } from "./role-fields";
import { LANGUAGES, WORK_MODES } from "@/lib/languages";

export const instant = false;

const label = "mb-1.5 block text-sm font-medium";
const required = <span aria-hidden className="ml-0.5 text-accent">*</span>;

export default async function NewTeamPage(props: PageProps<"/teams/new">) {
  const { error, opportunity } = await props.searchParams;
  const { supabase, isGuest } = await requireUser();
  if (isGuest) return <SignInPrompt text="Sign in to post a team." />;
  const day = today();
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, title")
    .eq("status", "live")
    .or(`deadline.gte.${day},starts_at.gte.${day},and(deadline.is.null,starts_at.is.null)`)
    .order("title");

  return (
    <form action={createTeam} className="max-w-form">
      <div className="flex flex-col gap-1.5 border-b border-line2 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl sm:tracking-tighter">Post a team</h1>
        <p className="text-base text-ink2">Say what you&apos;re building and which roles you still need. People apply; you accept or decline.</p>
      </div>

      <div className="space-y-4 py-6">
        <div>
          <label htmlFor="title" className={label}>What are you building?{required}</label>
          <input id="title" name="title" required minLength={3} maxLength={120} placeholder="AI study buddy for university students" className="input h-11 sm:h-10" />
        </div>
        <div>
          <label htmlFor="description" className={label}>More about it <span className="font-normal text-muted">(optional)</span></label>
          <textarea id="description" name="description" rows={4} maxLength={2000} placeholder="One or two lines on the idea and where it's at." className="input resize-none leading-normal" />
        </div>
        <RoleFields />
        <fieldset>
          <legend className={label}>Team language <span className="font-normal text-muted">(optional, one or more)</span></legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {LANGUAGES.map((l) => (
              <label
                key={l}
                className="flex min-h-10 cursor-pointer items-center justify-center rounded-md border border-line2 px-2 py-2 text-center text-sm text-ink2 transition-colors hover:border-muted has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
              >
                <input type="checkbox" name="languages" value={l} className="sr-only" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="work_mode" className={label}>How you&apos;ll work <span className="font-normal text-muted">(optional)</span></label>
          <span className="relative block">
            <select id="work_mode" name="work_mode" defaultValue="" className="input h-11 cursor-pointer appearance-none py-0 pr-8 sm:h-10">
              <option value="">Not decided</option>
              {WORK_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <svg viewBox="0 0 16 16" aria-hidden className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 fill-none stroke-muted" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="m4 6 4 4 4-4" />
            </svg>
          </span>
        </div>
        <div>
          <label htmlFor="opportunity_id" className={label}>For an opportunity <span className="font-normal text-muted">(optional)</span></label>
          <span className="relative block">
            <select id="opportunity_id" name="opportunity_id" defaultValue={typeof opportunity === "string" ? opportunity : ""} className="input h-11 cursor-pointer appearance-none py-0 pr-8 sm:h-10">
              <option value="">Not tied to one</option>
              {(opportunities ?? []).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
            <svg viewBox="0 0 16 16" aria-hidden className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 fill-none stroke-muted" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="m4 6 4 4 4-4" />
            </svg>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row-reverse sm:items-center sm:justify-between">
        <button className="btn h-11 w-full sm:h-[38px] sm:w-auto">Post team</button>
        {typeof error === "string" && <p role="alert" className="text-sm text-danger ">{error}</p>}
      </div>
    </form>
  );
}
