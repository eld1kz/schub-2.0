// An on/off switch with its label on the left, for forms that post it as a checkbox (DESIGN.md)
export function Switch({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 text-base">
      {label}
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-6.5 w-11 shrink-0 rounded-full bg-line2 transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 after:absolute after:top-0.75 after:left-0.75 after:h-5 after:w-5 after:rounded-full after:bg-background after:transition-transform peer-checked:after:translate-x-4.5"
      />
    </label>
  );
}
