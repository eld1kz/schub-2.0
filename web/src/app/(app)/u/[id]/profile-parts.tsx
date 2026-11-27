import type { ReactNode } from "react";
import { formatPeriod, type Experience } from "@/lib/portfolio";
import { today } from "@/lib/opportunities";
import { Chip, ChipList, MonoLabel, TimelineEntry } from "@/components/ui";

// The profile's own pieces, built from src/components/ui

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
          <MonoLabel className="sm:text-meta">{g.name}</MonoLabel>
          <ChipList className="gap-2">
            {g.skills.map((s) => (
              <Chip key={s.name} size="md" className={s.top ? "font-medium" : ""}>
                {s.name}
                {s.uses && <span className="ml-2 text-meta font-normal text-muted">{s.uses}</span>}
              </Chip>
            ))}
          </ChipList>
        </div>
      ))}
    </div>
  );
}

// One Experience entry on the timeline; current roles fill the dot with the accent. `edit`: the owner's pencil
export function ExperienceEntry({ experience: e, edit }: { experience: Omit<Experience, "id">; edit?: ReactNode }) {
  return (
    <TimelineEntry
      period={formatPeriod(e.start_date, e.end_date, new Date(today()))}
      title={e.role}
      meta={[e.company, e.type, e.location, e.remote && "Remote"].filter(Boolean).join(" · ")}
      description={e.description}
      chips={e.skills}
      current={!e.end_date}
      edit={edit}
    />
  );
}
