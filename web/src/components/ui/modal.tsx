"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { IconButton } from "./button";
import { useLinger } from "./use-linger";

// A modal (DESIGN.md): a bottom sheet on phones, a box near the top of the screen from sm up. The native modal
// dialog traps focus, closes on Escape and hands focus back. A click that starts and ends on the backdrop closes it.
// It fades and scales in (a sheet slides up). Its content is only rendered while it's open or closing. `dialogRef`, to close it from inside: dialogRef.current?.close().
// `tall`: full height on phones, for forms with their buttons pinned at the bottom.
// `scroll`: the dialog scrolls; off when the content scrolls a part of itself.
export function Modal({ open, onClose, label, width = "dialog", tall = false, scroll = true, dialogRef, children }: {
  open: boolean;
  onClose: () => void;
  label: string;
  width?: "dialog" | "measure";
  tall?: boolean;
  scroll?: boolean;
  dialogRef?: RefObject<HTMLDialogElement | null>;
  children: ReactNode;
}) {
  const own = useRef<HTMLDialogElement>(null);
  const dialog = dialogRef ?? own;
  const pressedOutside = useRef(false);
  const shown = useLinger(open, dialog);

  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open, dialog]);

  return (
    <dialog
      ref={dialog}
      aria-label={label}
      // React passes a dialog's close and cancel on to dialogs around it (a Combobox's sheet inside an edit dialog),
      // which would close them too
      onClose={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onCancel={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        pressedOutside.current = e.target === dialog.current;
      }}
      onClick={(e) => {
        if (pressedOutside.current && e.target === dialog.current) dialog.current?.close();
      }}
      className={[
        "motion-dialog m-0 mt-auto w-full max-w-none bg-background p-0 text-foreground backdrop:bg-scrim",
        "sm:mx-auto sm:mt-16 sm:mb-auto sm:max-h-[calc(100dvh-8rem)] sm:rounded-lg sm:border sm:border-line2 sm:shadow-modal",
        width === "dialog" ? "sm:max-w-dialog" : "sm:max-w-measure",
        tall ? "h-dvh max-h-dvh sm:h-fit" : "max-h-[92dvh] rounded-t-lg",
        scroll ? "overflow-y-auto" : "overflow-hidden",
      ].join(" ")}
    >
      {shown && children}
    </dialog>
  );
}

// The little handle at the top of a sheet, on phones
export function ModalGrabber() {
  return <div aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line2 sm:hidden" />;
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-none stroke-current" strokeWidth={2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

// Title and a close button, ruled off from the content
export function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
      <h2 className="text-base font-semibold sm:text-xl">{title}</h2>
      <IconButton label="Close" onClick={onClose}><CloseIcon /></IconButton>
    </div>
  );
}
