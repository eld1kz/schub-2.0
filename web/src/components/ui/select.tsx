import type { Ref, SelectHTMLAttributes } from "react";
import { inputClass, inputHeight } from "./field";

// A dropdown in the input style, with its own chevron. Empty shows the placeholder in a muted color; on an optional
// one, picking the placeholder clears it. Controlled (`value` and `onChange`) or not (`defaultValue`, for forms).
export function Select({ label, placeholder, value, defaultValue, onChange, options, selectRef, required = true, small = false, className = "", ...props }: {
  label?: string;
  // Without one, the first option is the default
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: { value: string; label: string }[];
  selectRef?: Ref<HTMLSelectElement>;
  required?: boolean;
  // The compact size used in filter bars
  small?: boolean;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value">) {
  const empty = value !== undefined ? !value : false;
  return (
    <span className={`relative block min-w-0 ${className}`}>
      <select
        ref={selectRef}
        aria-label={label}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange && ((e) => onChange(e.target.value))}
        required={required}
        className={`${inputClass} ${inputHeight(small)} cursor-pointer appearance-none pr-8 ${empty ? "text-muted" : ""}`}
        {...props}
      >
        {placeholder !== undefined && <option value="" disabled={required}>{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value} className="text-foreground">{o.label}</option>)}
      </select>
      <svg viewBox="0 0 16 16" aria-hidden className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 fill-none stroke-muted" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="m4 6 4 4 4-4" />
      </svg>
    </span>
  );
}
