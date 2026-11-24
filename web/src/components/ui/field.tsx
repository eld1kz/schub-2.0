import type { ComponentProps, ReactNode } from "react";

// Text inputs and their labels (DESIGN.md)
export const inputClass = "w-full rounded-md border border-line2 bg-transparent px-3 outline-none focus:border-accent focus:ring-1 focus:ring-accent";
// Inputs are 44px tall on phones, 40px from sm up. `small` (36px) is for filter bars and the top bar's search;
// `search` (40px, smaller text) for the search box over a list. `large` (44px everywhere) beside lg buttons (sign-in).
export const inputHeight = (small = false, search = false, large = false) =>
  small ? "h-9 text-sm" : search ? "h-10 text-sm" : large ? "h-11 text-base" : "h-11 text-base sm:h-10";

export function Input({ small = false, search = false, large = false, className = "", ...props }: ComponentProps<"input"> & { small?: boolean; search?: boolean; large?: boolean }) {
  return <input className={`${inputClass} ${inputHeight(small, search, large)} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${inputClass} resize-none py-2 text-base leading-normal ${className}`} {...props} />;
}

// The label above a field. `optional` adds "(optional)"; `required` a small accent star.
// `quiet`: smaller and in ink2, for fields grouped under a label of their own (the profile's edit dialogs).
export function FieldLabel({ htmlFor, required = false, optional = false, quiet = false, as = "label", children }: {
  htmlFor?: string;
  required?: boolean;
  optional?: boolean | string;
  quiet?: boolean;
  // "legend" inside a fieldset
  as?: "label" | "legend" | "span";
  children: ReactNode;
}) {
  const Tag = as;
  return (
    <Tag htmlFor={as === "label" ? htmlFor : undefined} className={`mb-1.5 block ${quiet ? "text-meta text-ink2" : "text-sm font-medium"}`}>
      {children}
      {required && <span aria-hidden className="ml-0.5 text-accent">*</span>}
      {optional && <span className="font-normal text-muted"> ({optional === true ? "optional" : optional})</span>}
    </Tag>
  );
}

// An error message. `under`: right under a field. `size` "sm": for the whole form, above its buttons.
// `as` "span" inside a row of buttons.
export function ErrorText({ under = false, size = "meta", as: Tag = "p", className = "", children }: {
  under?: boolean;
  size?: "meta" | "sm";
  as?: "p" | "span";
  className?: string;
  children: ReactNode;
}) {
  return <Tag role="alert" className={`text-danger ${size === "sm" ? "text-sm" : "text-meta"} ${under ? "mt-1.5" : ""} ${className}`}>{children}</Tag>;
}

// Label, the control, a hint under it and an error. `id` ties the label to the control.
export function Field({ id, label, required, optional, hint, error, children }: {
  id?: string;
  label: ReactNode;
  required?: boolean;
  optional?: boolean | string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id} required={required} optional={optional}>{label}</FieldLabel>
      {children}
      {hint && <p className="mt-1.5 text-meta text-muted">{hint}</p>}
      {error && <ErrorText under>{error}</ErrorText>}
    </div>
  );
}
