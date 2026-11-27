"use client";

import { useRef, useState } from "react";
import { Button, Field, Input, Modal, ModalGrabber, ModalHeader } from "@/components/ui";

// A Modal with a header, a field and buttons: a sheet on phones, a box from sm up
export function ModalDemo({ width, id }: { width: "dialog" | "measure"; id: string }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>Open {width} modal</Button>
      <Modal open={open} onClose={() => setOpen(false)} dialogRef={dialog} label="Example" width={width}>
        <ModalGrabber />
        <ModalHeader title="Edit intro" onClose={() => dialog.current?.close()} />
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
          <Field id={id} label="Name" required>
            <Input id={id} defaultValue="Jiwoo Park" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => dialog.current?.close()}>Cancel</Button>
            <Button type="button" onClick={() => dialog.current?.close()}>Save</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
