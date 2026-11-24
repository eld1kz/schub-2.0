import type { ReactNode } from "react";
import { formatPeriod, type Experience } from "@/lib/portfolio";

// The profile's building blocks: no cards, sections split by full-width rules,
// with a fixed label column so the structure comes from alignment.

// A main-column section. From sm up the title sits in a 152px column; the owner gets a third column for the pencil.
export function Section({ id, title, quiet = false, count, add, edit, editOnHover = false, owner = false, children }: {
  // For links to the section, like "#awards"
  id?: string;
  title: string;
  // Empty sections on your own profile: the title steps back
  quiet?: boolean;
  count?: number;
  // "+ Add" under the title
  add?: ReactNode;
  edit?: ReactNode;
  // The pencil shows on hover or keyboard focus, like Experience's (touch screens always show it)
  editOnHover?: boolean;
  owner?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`group/section relative border-t border-line2 py-6 sm:grid sm:gap-8 sm:py-8 ${owner ? "sm:grid-cols-[152px_minmax(0,1fr)_34px]" : "sm:grid-cols-[152px_minmax(0,1fr)]"}`}>
      <div className="mb-4 flex items-baseline justify-between gap-4 sm:mb-0 sm:flex-col sm:justify-start sm:gap-2">
        <h2 className={`text-base font-semibold ${quiet ? "text-ink2" : ""}`}>
          {title}
          {count !== undefined && <span className="ml-1.5 font-normal text-muted">{count}</span>}
        </h2>
        {add}
      </div>
      <div className="min-w-0">{children}</div>
      {/* Phones: the pencil sits at the top right of the section */}
      {edit && (
        <div className={`absolute top-4 right-0 sm:static sm:-mt-1.5 ${editOnHover ? "transition-opacity [@media(hover:hover)]:opacity-0 group-focus-within/section:opacity-100 group-hover/section:opacity-100" : ""}`}>
          {edit}
        </div>
      )}
    </section>
  );
}

// A sidebar block: the first one has no rule above it
export function SideBlock({ title, aside, quiet = false, edit, children }: { title: string; aside?: ReactNode; quiet?: boolean; edit?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-line2 py-6 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className={`text-base font-semibold ${quiet ? "text-ink2" : ""}`}>{title}</h2>
        {aside && <span className="text-sm text-ink2">{aside}</span>}
        {edit && <span className="-my-2 -mr-2">{edit}</span>}
      </div>
      {children}
    </section>
  );
}

// An empty section on your own profile, as a prompt. Visitors never see these.
export function EmptyPrompt({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed border-line2 p-4 sm:px-6 sm:py-6">
      <p className="text-base font-semibold sm:text-lg">{title}</p>
      <p className="max-w-measure text-sm leading-normal text-ink2 sm:text-base">{text}</p>
      <div>{children}</div>
    </div>
  );
}

// Label on the left, value on the right: links, contact details
export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="min-w-0 truncate text-right">{children}</span>
    </div>
  );
}

// Skills by category, spaced like timeline entries: a mono caps label, then the skills with where each is used
export function SkillRows({ groups }: { groups: { name: string; skills: { name: string; uses: string; top: boolean }[] }[] }) {
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {groups.map((g) => (
        <div key={g.name} className="flex flex-col gap-2">
          <p className="font-mono text-xs font-medium tracking-wide text-ink2 uppercase sm:text-meta">{g.name}</p>
          <ul className="flex flex-wrap gap-2">
            {g.skills.map((s) => (
              <li key={s.name} className={`rounded-sm bg-chip px-2 py-1 text-base ${s.top ? "font-medium" : ""}`}>
                {s.name}
                {s.uses && <span className="ml-2 text-meta font-normal text-muted">{s.uses}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// Experience as a timeline: one dot per entry on the line, filled with the accent for current roles
export function Timeline({ children }: { children: ReactNode }) {
  return <div className="ml-1 flex flex-col border-l-2 border-line2 sm:ml-1.5">{children}</div>;
}

// `edit`: the owner's pencil
export function TimelineEntry({ experience: e, edit }: { experience: Omit<Experience, "id">; edit?: ReactNode }) {
  return (
    <article className="group relative flex flex-col gap-0.5 pb-6 pl-6 last:pb-0 sm:gap-1 sm:pb-8 sm:pl-8">
      <span aria-hidden className={`absolute top-1 -left-[7px] h-3 w-3 rounded-full border-2 border-background sm:top-[5px] sm:-left-2 sm:h-3.5 sm:w-3.5 ${e.end_date ? "bg-line2" : "bg-accent"}`} />
      <div className="flex items-start justify-between gap-4">
        <p className="font-mono text-xs font-medium text-ink2 tabular-nums sm:text-meta">{formatPeriod(e.start_date, e.end_date)}</p>
        {/* Pointer devices: the pencil shows on hover or keyboard focus; touch screens always show it */}
        {edit && (
          <span className="-my-2 transition-opacity [@media(hover:hover)]:opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
            {edit}
          </span>
        )}
      </div>
      <h3 className="text-lg leading-snug font-semibold sm:text-xl sm:tracking-snug">{e.role}</h3>
      <p className="text-sm text-ink2 sm:text-base">{[e.company, e.type, e.location, e.remote && "Remote"].filter(Boolean).join(" · ")}</p>
      {e.description && <p className="mt-1.5 max-w-prose text-sm leading-normal whitespace-pre-wrap sm:text-base">{e.description}</p>}
      {e.skills.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {e.skills.map((s) => <li key={s} className="skill px-1.5 text-xs">{s}</li>)}
        </ul>
      )}
    </article>
  );
}
