"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import type { SaveResult } from "@/app/actions";
import { useToast } from "./toast";

type Props = {
  title: string;
  // "edit" and "add" are icon buttons for card headers; "button" is the Add button on an empty card
  trigger: "edit" | "add" | "button";
  label: string;
  save: (formData: FormData) => Promise<SaveResult>;
  remove?: () => Promise<SaveResult>;
  children: ReactNode;
};

const iconButton = "grid h-8 w-8 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// One section's form in a modal: a bottom sheet on phones, centered from sm up.
// The native modal dialog traps focus, closes on Escape and hands focus back to the trigger.
export function EditDialog({ title, trigger, label, save, remove, children }: Props) {
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

  return (
    <>
      {trigger === "button" ? (
        <button type="button" onClick={() => setOpen(true)} className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium hover:border-indigo-500 hover:text-indigo-600 dark:border-zinc-700 dark:hover:border-indigo-400 dark:hover:text-indigo-400">
          Add
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} aria-label={label} title={label} className={iconButton}>
          {trigger === "edit" ? <PencilIcon /> : <PlusIcon />}
        </button>
      )}
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
        className="m-0 mt-auto max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-0 text-foreground backdrop:bg-black/50 sm:m-auto sm:max-w-lg sm:rounded-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        {open && (
          <form onSubmit={onSubmit} className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold">{title}</h2>
              <button type="button" onClick={close} aria-label="Close" className={iconButton}>
                <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-none stroke-current" strokeWidth={2} strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            {children}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex items-center gap-3 pt-2">
              {remove && (
                <button type="button" onClick={onDelete} disabled={deleting} className="text-sm text-zinc-500 hover:text-red-600 disabled:opacity-60 dark:text-zinc-400 dark:hover:text-red-400">
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              )}
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={close} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  Cancel
                </button>
                <button disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
