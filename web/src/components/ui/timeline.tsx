import type { ReactNode } from "react";
import { Chip, ChipList } from "./chip";

// A vertical line with one dot per entry (DESIGN.md): Experience on a profile
export function Timeline({ children }: { children: ReactNode }) {
  return <div className="ml-1 flex flex-col border-l-2 border-line2 sm:ml-1.5">{children}</div>;
}

// One entry: the period in mono, the title, a line of details, an optional description and chips. `current` fills
// the dot with the accent. `edit`: the owner's pencil, shown on hover or keyboard focus (touch screens always).
export function TimelineEntry({ period, title, meta, description, chips = [], current = false, edit }: {
  period: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  description?: ReactNode;
  chips?: string[];
  current?: boolean;
  edit?: ReactNode;
}) {
  return (
    <article className="group relative flex flex-col gap-0.5 pb-6 pl-6 last:pb-0 sm:gap-1 sm:pb-8 sm:pl-8">
      <span aria-hidden className={`absolute top-1 -left-[7px] h-3 w-3 rounded-full border-2 border-background sm:top-[5px] sm:-left-2 sm:h-3.5 sm:w-3.5 ${current ? "bg-accent" : "bg-line2"}`} />
      <div className="flex items-start justify-between gap-4">
        <p className="font-mono text-xs font-medium text-ink2 tabular-nums sm:text-meta">{period}</p>
        {edit && (
          <span className="-my-2 transition-opacity [@media(hover:hover)]:opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
            {edit}
          </span>
        )}
      </div>
      <h3 className="text-lg leading-snug font-semibold sm:text-xl">{title}</h3>
      {meta && <p className="text-sm text-ink2 sm:text-base">{meta}</p>}
      {description && <p className="mt-1.5 max-w-prose text-sm leading-normal whitespace-pre-wrap sm:text-base">{description}</p>}
      {chips.length > 0 && (
        <ChipList className="mt-2">
          {chips.map((s) => <Chip key={s}>{s}</Chip>)}
        </ChipList>
      )}
    </article>
  );
}
