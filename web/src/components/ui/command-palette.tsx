"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ComboboxPanel, type ComboboxOption } from "./combobox-panel";
import { Modal, ModalGrabber, ModalHeader } from "./modal";

// A search over everything, with ⌘K: a field and a grouped list, in a box from sm up and a sheet on phones
// (DESIGN.md). Arrows move, Enter chooses, Escape closes. The caller filters `options` by `query`.
export function CommandPalette({ open, onClose, label, query, onQuery, options, onChoose }: {
  open: boolean;
  onClose: () => void;
  // Names the search field: "Search <label>"
  label: string;
  query: string;
  onQuery: (query: string) => void;
  options: ComboboxOption[];
  onChoose: (value: string) => void;
}) {
  const [active, setActive] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const index = Math.min(active, Math.max(0, options.length - 1));

  // After the dialog is showing (its own effect runs first)
  useEffect(() => {
    if (open) search.current?.focus();
  }, [open]);
  useEffect(() => {
    if (open) document.getElementById(`palette-option-${index}`)?.scrollIntoView({ block: "nearest" });
  }, [open, index]);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") setActive(Math.min(options.length - 1, index + 1));
    else if (e.key === "ArrowUp") setActive(Math.max(0, index - 1));
    else if (e.key === "Enter") {
      if (options[index]) onChoose(options[index].value);
    } else if (e.key === "Escape") dialog.current?.close();
    else return;
    e.preventDefault();
  }

  return (
    <Modal open={open} dialogRef={dialog} onClose={onClose} label="Search and jump to" width="measure" scroll={false}>
      <div className="flex h-[80dvh] flex-col pb-safe sm:h-[440px]">
        <ModalGrabber />
        <ModalHeader title="Search" onClose={() => dialog.current?.close()} />
        <ComboboxPanel
          id="palette"
          label={label}
          options={options}
          selected=""
          active={index}
          query={query}
          searchable
          searchRef={search}
          onQuery={(next) => {
            setActive(0);
            onQuery(next);
          }}
          onActive={setActive}
          onChoose={onChoose}
          onKeyDown={onKeyDown}
        />
      </div>
    </Modal>
  );
}
