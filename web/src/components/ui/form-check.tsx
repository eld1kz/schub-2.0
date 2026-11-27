"use client";

import { createContext, useContext, useState, type ComponentProps, type ReactNode } from "react";
import { ErrorText } from "./field";

// Forms never disable their Save button: pressing it with something missing says what, under each field (DESIGN.md).
// The browser's own checks (required, minLength, type, custom validity) decide what's missing. A field is found by
// its control's name, or by `data-field` on an element around it; `data-missing` there (or on the control) is the
// wording when it's empty. The form itself is `noValidate`, so no browser bubbles.

type Missing = Record<string, string>;
type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function messageFor(control: Control) {
  const { validity } = control;
  if (validity.customError) return control.validationMessage;
  if (validity.valueMissing) return control.closest<HTMLElement>("[data-missing]")?.dataset.missing ?? "Fill this in.";
  if (validity.tooShort) return control.closest<HTMLElement>("[data-missing]")?.dataset.missing ?? "That's too short.";
  if (validity.typeMismatch) return control.type === "email" ? "Enter a valid email address." : "Enter a full link, starting with https://.";
  return control.validationMessage;
}

function missingIn(form: HTMLFormElement) {
  const missing: Missing = {};
  let first: Control | undefined;
  for (const el of form.elements) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) continue;
    if (!el.willValidate || el.validity.valid) continue;
    missing[el.closest<HTMLElement>("[data-field]")?.dataset.field ?? el.name] ??= messageFor(el);
    first ??= el;
  }
  return { missing, first };
}

// `check` on submit: true when nothing's missing, otherwise the messages show and the first such field takes the
// focus. `recheck` after any edit: messages go as their fields are filled in; new ones wait for the next press.
export function useFormCheck() {
  const [missing, setMissing] = useState<Missing>({});
  return {
    missing,
    check(form: HTMLFormElement) {
      const found = missingIn(form);
      setMissing(found.missing);
      // A dropdown's or the role chips' hidden input stands for the buttons beside it
      const hidden = found.first?.matches("[data-combobox-value], [aria-hidden]");
      (hidden ? found.first?.parentElement?.querySelector<HTMLElement>("button:not(:disabled)") : found.first)?.focus();
      return !found.first;
    },
    recheck(form: HTMLFormElement) {
      // After the fields' own effects, which set custom validity
      setTimeout(() =>
        setMissing((shown) => {
          if (Object.keys(shown).length === 0) return shown;
          const now = missingIn(form).missing;
          return Object.fromEntries(Object.keys(shown).filter((k) => k in now).map((k) => [k, now[k]]));
        }),
      );
    },
    clear: () => setMissing({}),
  };
}

// The last save's error, when it names a field
type Saved = { message: string; field?: string } | null;
const FormErrorsContext = createContext<{ missing: Missing; saved: Saved }>({ missing: {}, saved: null });

export function FormErrors({ missing, saved = null, children }: { missing: Missing; saved?: Saved; children: ReactNode }) {
  return <FormErrorsContext value={{ missing, saved }}>{children}</FormErrorsContext>;
}

// A short error under a field: the field's own live check (`message`), what's missing, or the last save's
export function FieldError({ field, message }: { field: string; message?: string }) {
  const { missing, saved } = useContext(FormErrorsContext);
  const text = message || missing[field] || (saved?.field === field ? saved.message : "");
  return text ? <ErrorText under>{text}</ErrorText> : null;
}

// A server action's form with the same check, for pages that post straight to an action
export function CheckedForm({ children, ...props }: Omit<ComponentProps<"form">, "onSubmit" | "onInput" | "onClick" | "noValidate">) {
  const { missing, check, recheck } = useFormCheck();
  return (
    <form
      {...props}
      noValidate
      onSubmit={(e) => {
        if (!check(e.currentTarget)) e.preventDefault();
      }}
      onInput={(e) => recheck(e.currentTarget)}
      onClick={(e) => recheck(e.currentTarget)}
    >
      <FormErrors missing={missing}>{children}</FormErrors>
    </form>
  );
}
