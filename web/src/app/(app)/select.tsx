import type { Ref } from "react";

// A dropdown in the input style, with its own chevron. Empty shows the placeholder in a muted color;
// on an optional one, picking the placeholder clears it.
export function Select({ label, placeholder, value, onChange, options, selectRef, name, id, required = true, small = false }: {
  label?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  selectRef?: Ref<HTMLSelectElement>;
  name?: string;
  id?: string;
  required?: boolean;
  // The compact size used in filter bars
  small?: boolean;
}) {
  return (
    <span className="relative block min-w-0">
      <select
        ref={selectRef}
        id={id}
        name={name}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`input cursor-pointer appearance-none py-0 pr-9 ${small ? "h-9 text-sm" : "h-11 sm:h-10"} ${value ? "" : "text-muted"}`}
      >
        <option value="" disabled={required}>{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value} className="text-foreground">{o.label}</option>)}
      </select>
      <svg viewBox="0 0 16 16" aria-hidden className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 fill-none stroke-muted" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="m4 6 4 4 4-4" />
      </svg>
    </span>
  );
}
