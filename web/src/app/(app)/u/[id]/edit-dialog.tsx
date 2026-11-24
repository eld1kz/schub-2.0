"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import type { SaveResult } from "@/app/actions";
import { useToast } from "./toast";

type Props = {
  title: string;
  // "edit" is a pencil; "link" is "+ cta" in accent text; "button" is the outlined "+ cta" in an empty section;
  // "action" is a plain outlined button reading `cta`
  trigger: "edit" | "link" | "button" | "action";
  label: string;
  // Text of the link and button triggers; defaults to `label`
  cta?: string;
  // One line in the footer, like who gets to see these fields
  note?: string;
  save: (formData: FormData) => Promise<SaveResult>;
  remove?: () => Promise<SaveResult>;
  // Phones: full height, with Save pinned at the bottom instead of in the top bar
  tall?: boolean;
  // Save stays disabled until every required field is filled and valid
  requireValid?: boolean;
  // Text of the Save button, and of the toast after it worked
  submit?: string;
  done?: string;
  children: ReactNode;
};

type SaveError = { message: string; field?: string };

// A save error that names a field is shown under that field (see useFieldError); others at the end of the form
const FieldErrorContext = createContext<SaveError | null>(null);

export function useFieldError(field: string) {
  const error = useContext(FieldErrorContext);
  return error?.field === field ? error.message : "";
}

// A short error under a field, from the last save or from the field's own check (`message`)
export function FieldError({ field, message }: { field: string; message?: string }) {
  const saved = useFieldError(field);
  const text = message || saved;
  return text ? <p role="alert" className="mt-1.5 text-meta text-danger ">{text}</p> : null;
}

const iconButton = "grid h-[34px] w-[34px] shrink-0 place-items-center rounded-md text-ink2 hover:bg-chip hover:text-foreground";

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth={1.5}>
      <path d="M10.5 2.5l3 3L5 14H2v-3z" />
    </svg>
  );
}

// One section's form in a modal: a bottom sheet on phones, near the top of the screen from sm up.
// The native modal dialog traps focus, closes on Escape and hands focus back to the trigger.
export function EditDialog({ title, trigger, label, cta = label, note, save, remove, tall = false, requireValid = false, submit = "Save", done = "Saved", children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const pressedOutside = useRef(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<SaveError | null>(null);
  const [valid, setValid] = useState(!requireValid);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    // Start on the first field rather than the close button
    dialog.current?.querySelector<HTMLElement>("input:not([type=hidden]):not([type=file]):not([type=checkbox]), textarea")?.focus();
    checkValid();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => dialog.current?.close();
  const noun = title.replace(/^(Edit|Add) /i, "").toLowerCase();

  // After the fields' own effects have run, since some set custom validity there
  function checkValid() {
    if (requireValid) setTimeout(() => setValid(form.current?.checkValidity() ?? false));
  }

  // Not a form `action`: React would reset the fields after it, even when the save failed
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSave(async () => {
      const result = await save(formData);
      if (result.error) return setError({ message: result.error, field: result.field });
      close();
      toast(done);
    });
  }

  function onDelete() {
    if (!remove || !confirm(`Delete this ${noun}?`)) return;
    startDelete(async () => {
      const result = await remove();
      if (result.error) return setError({ message: result.error });
      close();
      toast("Deleted");
    });
  }

  const triggers = {
    edit: (
      <button type="button" onClick={() => setOpen(true)} aria-label={label} title={label} className={iconButton}>
        <PencilIcon />
      </button>
    ),
    link: (
      <button type="button" onClick={() => setOpen(true)} className="text-left text-sm font-semibold text-accent hover:underline">
        + {cta}
      </button>
    ),
    button: (
      <button type="button" onClick={() => setOpen(true)} className="h-11 w-full rounded-md border border-accent px-4 text-base font-semibold text-accent hover:bg-accent-soft sm:h-9 sm:w-auto sm:text-sm">
        + {cta}
      </button>
    ),
    action: (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline h-9">
        {cta}
      </button>
    ),
  };

  return (
    <>
      {triggers[trigger]}
      <dialog
        ref={dialog}
        aria-label={title}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
        // A click that starts and ends on the backdrop (the dialog box itself, outside the panel) closes it
        onMouseDown={(e) => {
          pressedOutside.current = e.target === dialog.current;
        }}
        onClick={(e) => {
          if (pressedOutside.current && e.target === dialog.current) close();
        }}
        className={`m-0 mt-auto w-full max-w-none overflow-hidden bg-background ${tall ? "h-dvh max-h-dvh sm:h-fit" : "max-h-[92dvh] rounded-t-lg"} p-0 text-foreground backdrop:bg-[rgba(20,20,24,0.45)] sm:mx-auto sm:mt-16 sm:mb-auto sm:max-h-[calc(100dvh-8rem)] sm:max-w-dialog sm:rounded-lg sm:border sm:border-line2 sm:shadow-modal `}
      >
        {open && (
          <form
            ref={form}
            onSubmit={onSubmit}
            // Any edit clears the last save error and rechecks what's required
            onInput={() => {
              setError(null);
              checkValid();
            }}
            onChange={checkValid}
            className={`flex max-h-[inherit] flex-col ${tall ? "h-full sm:h-auto" : ""}`}
          >
            {!tall && <div aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line2 sm:hidden" />}
            {/* Phones: Cancel, title and Save across the top (Save moves to the bottom when tall). From sm up: title and a close button. */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 pt-3 pb-3 sm:px-6 sm:py-4">
              <button type="button" onClick={close} className="text-base text-ink2 sm:hidden">Cancel</button>
              <h2 className="text-base font-semibold sm:text-xl sm:tracking-snug">{title}</h2>
              {tall ? (
                <span aria-hidden className="w-12 sm:hidden" />
              ) : (
                <button disabled={saving || !valid} className="text-base font-semibold text-accent disabled:opacity-40 sm:hidden">
                  {saving ? "Saving..." : submit}
                </button>
              )}
              <button type="button" onClick={close} aria-label="Close" className={`${iconButton} hidden sm:grid`}>
                <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-none stroke-current" strokeWidth={2} strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-0">
              <FieldErrorContext value={error}>{children}</FieldErrorContext>
              {error && !error.field && <p role="alert" className="pb-4 text-sm text-danger ">{error.message}</p>}
            </div>
            <div className={`${tall || note || remove ? "flex" : "hidden sm:flex"} shrink-0 items-center gap-4 border-t border-border px-4 py-4 sm:px-6`}>
              {note && <p className="text-meta text-ink2">{note}</p>}
              {remove && (
                <button type="button" onClick={onDelete} disabled={deleting} className={`text-sm text-ink2 hover:text-danger disabled:opacity-60 ${tall ? "" : "ml-auto sm:ml-0"}`}>
                  {deleting ? "Deleting..." : `Delete ${noun}`}
                </button>
              )}
              <div className={`${tall ? "flex flex-1 justify-end" : "hidden sm:flex"} ml-auto gap-2`}>
                <button type="button" onClick={close} className="btn-outline hidden sm:inline-flex">Cancel</button>
                <button disabled={saving || !valid} className={`btn disabled:opacity-40 ${tall ? `h-11 sm:h-[38px] ${remove ? "" : "w-full sm:w-auto"}` : ""}`}>
                  {saving ? "Saving..." : submit}
                </button>
              </div>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
