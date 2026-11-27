"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import type { SaveResult } from "@/app/actions";
import { useToast } from "./toast";
import { CloseIcon, ErrorText, IconButton, Modal, ModalGrabber, buttonClass } from "@/components/ui";

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
  return text ? <ErrorText under>{text}</ErrorText> : null;
}

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
    dialog.current?.querySelector<HTMLElement>("input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([data-combobox-value]), textarea")?.focus();
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
      <IconButton label={label} onClick={() => setOpen(true)}>
        <PencilIcon />
      </IconButton>
    ),
    link: (
      <button type="button" onClick={() => setOpen(true)} className="text-left text-sm font-semibold text-accent hover:underline">
        + {cta}
      </button>
    ),
    button: (
      <button type="button" onClick={() => setOpen(true)} className={buttonClass({ variant: "accent", size: "touch", full: true })}>
        + {cta}
      </button>
    ),
    action: (
      <button type="button" onClick={() => setOpen(true)} className={buttonClass({ variant: "secondary", size: "sm" })}>
        {cta}
      </button>
    ),
  };

  return (
    <>
      {triggers[trigger]}
      <Modal
        open={open}
        dialogRef={dialog}
        label={title}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
        tall={tall}
        scroll={false}
      >
          <form
            ref={form}
            onSubmit={onSubmit}
            // Any edit clears the last save error and rechecks what's required
            onInput={() => {
              setError(null);
              checkValid();
            }}
            onChange={checkValid}
            className={`flex max-h-inherit flex-col ${tall ? "h-full sm:h-auto" : ""}`}
          >
            {!tall && <ModalGrabber />}
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
              <IconButton label="Close" onClick={close} className="hidden sm:grid"><CloseIcon /></IconButton>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-0">
              <FieldErrorContext value={error}>{children}</FieldErrorContext>
              {error && !error.field && <ErrorText size="sm" className="pb-4">{error.message}</ErrorText>}
            </div>
            <div className={`${tall || note || remove ? "flex" : "hidden sm:flex"} shrink-0 items-center gap-4 border-t border-border px-4 py-4 sm:px-6`}>
              {note && <p className="text-meta text-ink2">{note}</p>}
              {remove && (
                <button type="button" onClick={onDelete} disabled={deleting} className={`text-sm text-ink2 hover:text-danger disabled:opacity-60 ${tall ? "" : "ml-auto sm:ml-0"}`}>
                  {deleting ? "Deleting..." : `Delete ${noun}`}
                </button>
              )}
              <div className={`${tall ? "flex flex-1 justify-end" : "hidden sm:flex"} ml-auto gap-2`}>
                <button type="button" onClick={close} className={buttonClass({ variant: "secondary", showFrom: "sm" })}>Cancel</button>
                <button disabled={saving || !valid} className={buttonClass({ size: tall ? "touch" : "md", full: tall && !remove })}>
                  {saving ? "Saving..." : submit}
                </button>
              </div>
            </div>
          </form>
      </Modal>
    </>
  );
}
