"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import type { SaveResult } from "@/app/actions";
import { useToast } from "./toast";

type Props = {
  title: string;
  // "edit" is a pencil; "link" is "+ cta" in accent text; "button" is the outlined "+ cta" in an empty section
  trigger: "edit" | "link" | "button";
  label: string;
  // Text of the link and button triggers; defaults to `label`
  cta?: string;
  // One line in the footer, like who gets to see these fields
  note?: string;
  save: (formData: FormData) => Promise<SaveResult>;
  remove?: () => Promise<SaveResult>;
  children: ReactNode;
};

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
export function EditDialog({ title, trigger, label, cta = label, note, save, remove, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pressedOutside = useRef(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    // Start on the first field rather than the close button
    dialog.current?.querySelector<HTMLElement>("input:not([type=hidden]):not([type=file]):not([type=checkbox]), textarea")?.focus();
  }, [open]);

  const close = () => dialog.current?.close();

  // Not a form `action`: React would reset the fields after it, even when the save failed
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSave(async () => {
      const result = await save(formData);
      if (result.error) return setError(result.error);
      close();
      toast("Saved");
    });
  }

  function onDelete() {
    if (!remove || !confirm(`Delete this ${title.replace(/^(Edit|Add) /i, "").toLowerCase()}?`)) return;
    startDelete(async () => {
      const result = await remove();
      if (result.error) return setError(result.error);
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
      <button type="button" onClick={() => setOpen(true)} className="h-11 w-full rounded-md border border-accent px-4 text-[15px] font-semibold text-accent hover:bg-accent-soft sm:h-9 sm:w-auto sm:text-sm">
        + {cta}
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
          setError("");
        }}
        // A click that starts and ends on the backdrop (the dialog box itself, outside the panel) closes it
        onMouseDown={(e) => {
          pressedOutside.current = e.target === dialog.current;
        }}
        onClick={(e) => {
          if (pressedOutside.current && e.target === dialog.current) close();
        }}
        className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-2xl bg-background p-0 text-foreground backdrop:bg-[rgba(20,20,24,0.45)] sm:mx-auto sm:mt-16 sm:mb-auto sm:max-h-[calc(100dvh-8rem)] sm:max-w-[680px] sm:rounded-[10px] sm:border sm:border-line2 sm:shadow-[0_24px_60px_rgba(0,0,0,0.22)] dark:backdrop:bg-black/60"
      >
        {open && (
          <form onSubmit={onSubmit} className="flex max-h-[inherit] flex-col">
            <div aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line2 sm:hidden" />
            {/* Phones: Cancel, title and Save across the top. From sm up: title and a close button. */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 pt-3 pb-3.5 sm:px-7 sm:py-5">
              <button type="button" onClick={close} className="text-[15px] text-ink2 sm:hidden">Cancel</button>
              <h2 className="text-base font-semibold sm:text-xl sm:tracking-[-0.01em]">{title}</h2>
              <button disabled={saving} className="text-[15px] font-semibold text-accent disabled:opacity-60 sm:hidden">
                {saving ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={close} aria-label="Close" className={`${iconButton} hidden sm:grid`}>
                <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-none stroke-current" strokeWidth={2} strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-7 sm:pb-0">
              {children}
              {error && <p className="pb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
            <div className={`${note || remove ? "flex" : "hidden sm:flex"} shrink-0 items-center gap-4 border-t border-border px-5 py-4 sm:px-7`}>
              {note && <p className="text-[13px] text-ink2">{note}</p>}
              {remove && (
                <button type="button" onClick={onDelete} disabled={deleting} className="ml-auto text-sm text-ink2 hover:text-red-600 disabled:opacity-60 sm:ml-0 dark:hover:text-red-400">
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              )}
              <div className="ml-auto hidden gap-2.5 sm:flex">
                <button type="button" onClick={close} className="btn-outline">Cancel</button>
                <button disabled={saving} className="btn">{saving ? "Saving..." : "Save"}</button>
              </div>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
