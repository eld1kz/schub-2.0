// What a button shows while it works (Button's `pending`) and right after it worked (`done`)
export function Spinner() {
  return <span aria-hidden className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden data-check className="h-4 w-4 animate-pop fill-none stroke-current" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 8.5 3.5 3.5L13 4.5" />
    </svg>
  );
}
