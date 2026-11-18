// A small medal after a name in People and Teams rows: the person has at least one award
export function AwardMark() {
  return (
    <span title="Has an award" className="inline-flex shrink-0 align-[-0.125em] text-accent">
      <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 1.5h6M5 1.5l1.8 4.7M11 1.5l-1.8 4.7" />
        <circle cx="8" cy="10" r="4" />
      </svg>
      <span className="sr-only">Has an award</span>
    </span>
  );
}
