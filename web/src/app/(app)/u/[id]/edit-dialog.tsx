"use client";

import { Pencil } from "lucide-react";
import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import type { SaveResult } from "@/app/actions";
import { Button, CloseIcon, ErrorText, IconButton, Modal, ModalGrabber, buttonClass, useToast, Icon, FormErrors, useFormCheck } from "@/components/ui";

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
  // Text of the Save button, and of the toast after it worked
  submit?: string;
  done?: string;
  // Show the check as soon as Save is pressed (Apply), taking it back if it fails
  optimistic?: boolean;
  children: ReactNode;
};

function PencilIcon() {
  return (
    <Icon icon={Pencil} />
  );
}

// One section's form in a modal: a bottom sheet on phones, near the top of the screen from sm up.
// The native modal dialog traps focus, closes on Escape and hands focus back to the trigger.
export function EditDialog({ title, trigger, label, cta = label, note, save, remove, tall = false, submit = "Save", done = "Saved", optimistic = false, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  // What pressing Save found missing
  const { missing, check, recheck, clear } = useFormCheck();
  const [saving, startSave] = useTransition();
  // The check on Save, shown briefly before the dialog closes
  const [saved, setSaved] = useState(false);
  const [deleting, startDelete] = useTransition();
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    // Start on the first field rather than the close button
    dialog.current?.querySelector<HTMLElement>("input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([data-combobox-value]), textarea")?.focus();
  }, [open]);

  // The check is cleared on opening, not closing, so it stays while the dialog fades out
  function show() {
    setSaved(false);
    setOpen(true);
  }
  const close = () => dialog.current?.close();
  const noun = title.replace(/^(Edit|Add) /i, "").toLowerCase();

  // Not a form `action`: React would reset the fields after it, even when the save failed
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!check(e.currentTarget)) return;
    const formData = new FormData(e.currentTarget);
    if (optimistic) setSaved(true);
    startSave(async () => {
      const result = await save(formData);
      if (result.error) {
        setSaved(false);
        return setError({ message: result.error, field: result.field });
      }
      // The page behind changes once this finishes, so the check is seen first
      setSaved(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
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
      <IconButton label={label} onClick={show}>
        <PencilIcon />
      </IconButton>
    ),
    link: (
      <button type="button" onClick={show} className="text-left text-sm font-semibold text-accent hover:underline">
        + {cta}
      </button>
    ),
    button: (
      <button type="button" onClick={show} className={buttonClass({ variant: "accent", size: "touch", full: true })}>
        + {cta}
      </button>
    ),
    action: (
      <button type="button" onClick={show} className={buttonClass({ variant: "secondary", size: "sm" })}>
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
          clear();
        }}
        tall={tall}
        scroll={false}
      >
          <form
            onSubmit={onSubmit}
            noValidate
            // Any edit clears the last save error, and messages for what's no longer missing
            onInput={(e) => {
              setError(null);
              recheck(e.currentTarget);
            }}
            onClick={(e) => recheck(e.currentTarget)}
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
                <Button variant="bare" pending={saving && !saved} done={saved} className="text-base font-semibold text-accent sm:hidden">
                  {submit}
                </Button>
              )}
              <IconButton label="Close" onClick={close} className="hidden sm:grid"><CloseIcon /></IconButton>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-0">
              <FormErrors missing={missing} saved={error}>{children}</FormErrors>
              {error && !error.field && <ErrorText size="sm" className="pb-4">{error.message}</ErrorText>}
            </div>
            <div className={`${tall || note || remove ? "flex" : "hidden sm:flex"} shrink-0 items-center gap-4 border-t border-border px-4 py-4 sm:px-6`}>
              {note && <p className="text-meta text-ink2">{note}</p>}
              {remove && (
                <Button type="button" variant="bare" onClick={onDelete} pending={deleting} className={`text-sm text-ink2 hover:text-danger ${tall ? "" : "ml-auto sm:ml-0"}`}>
                  Delete {noun}
                </Button>
              )}
              <div className={`${tall ? "flex flex-1 justify-end" : "hidden sm:flex"} ml-auto gap-2`}>
                <Button type="button" variant="secondary" showFrom="sm" shortcut="Esc" onClick={close}>Cancel</Button>
                <Button size={tall ? "touch" : "md"} full={tall && !remove} pending={saving && !saved} done={saved}>
                  {submit}
                </Button>
              </div>
            </div>
          </form>
      </Modal>
    </>
  );
}
