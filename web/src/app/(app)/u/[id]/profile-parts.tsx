import type { ReactNode } from "react";

// The profile's building blocks: no cards, sections split by full-width rules,
// with a fixed label column so the structure comes from alignment.

// A main-column section. From sm up the title sits in a 152px column; the owner gets a third column for the pencil.
export function Section({ id, title, quiet = false, count, add, edit, owner = false, children }: {
  // For links to the section, like "#awards"
  id?: string;
  title: string;
  // Empty sections on your own profile: the title steps back
  quiet?: boolean;
  count?: number;
  // "+ Add" under the title
  add?: ReactNode;
  edit?: ReactNode;
  owner?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`relative border-t border-line2 py-6 sm:grid sm:gap-8 sm:py-8 ${owner ? "sm:grid-cols-[152px_minmax(0,1fr)_34px]" : "sm:grid-cols-[152px_minmax(0,1fr)]"}`}>
      <div className="mb-4 flex items-baseline justify-between gap-4 sm:mb-0 sm:flex-col sm:justify-start sm:gap-2.5">
        <h2 className={`text-[15px] font-semibold ${quiet ? "text-ink2" : ""}`}>
          {title}
          {count !== undefined && <span className="ml-1.5 font-normal text-muted">{count}</span>}
        </h2>
        {add}
      </div>
      <div className="min-w-0">{children}</div>
      {/* Phones: the pencil sits at the top right of the section */}
      {edit && <div className="absolute top-4 right-0 sm:static sm:-mt-1.5">{edit}</div>}
    </section>
  );
}

// A sidebar block: the first one has no rule above it
export function SideBlock({ title, aside, quiet = false, edit, children }: { title: string; aside?: ReactNode; quiet?: boolean; edit?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5 border-t border-line2 py-6 first:border-t-0 first:pt-0 sm:py-7">
      <div className="flex items-center justify-between gap-3">
        <h2 className={`text-[15px] font-semibold ${quiet ? "text-ink2" : ""}`}>{title}</h2>
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
    <div className="flex flex-col gap-3.5 rounded-md border border-dashed border-line2 p-5 sm:px-6 sm:py-[22px]">
      <p className="text-base font-semibold sm:text-[17px]">{title}</p>
      <p className="max-w-[520px] text-sm leading-normal text-ink2 sm:text-[15px]">{text}</p>
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

// Rows of chips with a small label column, like the skills table
export function ChipTable({ rows, mono = false }: { rows: { name: string; items: string[] }[]; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:gap-0">
      {rows.map((r) => (
        <div key={r.name} className="flex flex-col gap-1.5 sm:grid sm:grid-cols-[104px_minmax(0,1fr)] sm:items-baseline sm:gap-4 sm:border-b sm:border-border sm:py-2.5">
          <span className="text-[13px] text-muted sm:text-sm">{r.name}</span>
          <ul className="flex flex-wrap gap-1.5">
            {r.items.map((item) => (
              <li key={item} className={mono ? "skill" : "rounded bg-chip px-2 py-0.5 text-[13px]"}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// Initials of an organization on a chip, in place of a logo
export function OrgMark({ name }: { name: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  return (
    <div aria-hidden className="grid h-9 w-9 place-items-center rounded-md bg-chip text-[13px] font-semibold text-ink2 sm:h-11 sm:w-11 sm:text-[15px]">
      {initials}
    </div>
  );
}
