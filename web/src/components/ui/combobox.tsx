"use client";

import { useEffect, useId, useImperativeHandle, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { ComboboxPanel, type ComboboxOption } from "./combobox-panel";
import { inputClass, inputHeight } from "./field";
import { Modal, ModalGrabber, ModalHeader } from "./modal";
import { useLinger } from "./use-linger";

// What a form can do with one: send the focus to it, or block submitting with a message
export type ComboboxHandle = { focus: () => void; setCustomValidity: (message: string) => void };

// Lists longer than this get a search field
const SEARCH_OVER = 8;
// Matches without caring about case or accents: "cote" finds "Côte d’Ivoire"
const plain = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// A dropdown in the input style: a button that opens a list, in a popup from sm up and a bottom sheet on phones.
// It acts like a native select in a form: it posts `name`, takes part in `required` and custom validity, and picking
// an option sends the form an input event. Controlled (`value` and `onChange`) or not (`defaultValue`).
// Keys: arrows, Home, End, Enter, Escape, and typing, which searches (long lists) or jumps to an option.
export function Combobox({ id, name, label, labelled = false, placeholder, value, defaultValue, onChange, options, ref, required = true, small = false, disabled = false }: {
  id?: string;
  name?: string;
  // What it picks. Names the list, the sheet and, unless `labelled`, the button.
  label: string;
  // A <label htmlFor={id}> on the page already names the button
  labelled?: boolean;
  // Shown while nothing is picked. On an optional one it's also the first option, which clears the choice.
  // Without one, the first option is the default.
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: ComboboxOption[];
  ref?: Ref<ComboboxHandle>;
  required?: boolean;
  // The compact size used in filter bars
  small?: boolean;
  disabled?: boolean;
}) {
  const uid = useId();
  const rows = placeholder !== undefined && !required ? [{ value: "", label: placeholder }, ...options] : options;
  const fallback = placeholder === undefined ? (options[0]?.value ?? "") : "";
  const [own, setOwn] = useState(defaultValue ?? fallback);
  const wanted = value ?? own;
  // As a select does, a value that isn't on the list falls back to the default
  const selected = rows.some((o) => o.value === wanted) ? wanted : fallback;
  const current = rows.find((o) => o.value === selected);
  const searchable = options.length > SEARCH_OVER;

  // null while closed; `sheet` is decided on opening, by the screen's width
  const [open, setOpen] = useState<{ sheet: boolean } | null>(null);
  // Which of the two it was last opened as, which it still is while closing
  const [sheet, setSheet] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const shown = query ? rows.filter((o) => plain(o.label).includes(plain(query.trim()))) : rows;

  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const popupShown = useLinger(open !== null && !open.sheet, popup);

  useImperativeHandle(ref, () => ({
    focus: () => trigger.current?.focus(),
    setCustomValidity: (message) => input.current?.setCustomValidity(message),
  }), []);

  function show(from: { index?: number; query?: string } = {}) {
    if (disabled) return;
    setQuery(from.query ?? "");
    setActive(from.index ?? (from.query ? 0 : Math.max(0, rows.findIndex((o) => o.value === selected))));
    const small = !window.matchMedia("(min-width: 640px)").matches;
    setSheet(small);
    setOpen({ sheet: small });
  }

  function close() {
    // Closing the sheet's dialog calls back into onClose below
    if (open?.sheet) dialog.current?.close();
    else {
      setOpen(null);
      trigger.current?.focus();
    }
  }

  function choose(next: string) {
    const el = input.current;
    if (el && next !== selected) {
      // Set it the way typing would, so React's onChange here and the form's onInput both hear it
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, next);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    close();
  }

  // The popup sits in the top layer, so a scrolling dialog can't clip it: under the button, or over it when there's
  // more room there
  useEffect(() => {
    if (!open || open.sheet) return;
    const panel = popup.current;
    const button = trigger.current;
    if (!panel || !button) return;
    panel.showPopover();
    const place = () => {
      const at = button.getBoundingClientRect();
      const below = window.innerHeight - at.bottom - 12;
      const above = at.top - 12;
      const up = below < 240 && above > below;
      const width = Math.max(at.width, 224);
      panel.style.transformOrigin = up ? "bottom" : "top";
      Object.assign(panel.style, {
        width: `${width}px`,
        maxHeight: `${Math.min(360, up ? above : below)}px`,
        left: `${Math.max(8, Math.min(at.left, window.innerWidth - width - 8))}px`,
        top: up ? "auto" : `${at.bottom + 4}px`,
        bottom: up ? `${window.innerHeight - at.top + 4}px` : "auto",
      });
    };
    const outside = (e: PointerEvent) => {
      if (!panel.contains(e.target as Node) && !button.contains(e.target as Node)) setOpen(null);
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", outside, true);
    return () => {
      if (panel.isConnected) panel.hidePopover();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", outside, true);
    };
  }, [open]);

  // After the popup or sheet is showing. On phones the list takes the focus, so the keyboard doesn't cover the sheet
  // until the search field is tapped.
  useEffect(() => {
    if (!open) return;
    (searchable && !open.sheet ? search.current : list.current)?.focus({ preventScroll: true });
  }, [open, searchable]);

  useEffect(() => {
    if (open) document.getElementById(`${uid}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, uid]);

  // The next option starting with what's been typed in the last half second; one letter repeated steps through
  function jump(key: string, from: number) {
    const now = Date.now();
    const text = (now - typed.current.at < 500 ? typed.current.text : "") + plain(key);
    typed.current = { text, at: now };
    const repeated = [...text].every((c) => c === text[0]);
    const start = repeated ? from + 1 : from;
    for (let i = 0; i < rows.length; i++) {
      const index = (start + i) % rows.length;
      if (plain(rows[index].label).startsWith(repeated ? text[0] : text)) return index;
    }
    return from;
  }

  const isCharacter = (e: KeyboardEvent) => e.key.length === 1 && e.key !== " " && !e.ctrlKey && !e.metaKey && !e.altKey;

  // While closed: Enter and Space press the button; arrows and typing open it too
  function onTriggerKey(e: KeyboardEvent) {
    if (open) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") show();
    else if (e.key === "Home") show({ index: 0 });
    else if (e.key === "End") show({ index: rows.length - 1 });
    else if (isCharacter(e)) show(searchable ? { query: e.key } : { index: jump(e.key, rows.findIndex((o) => o.value === selected)) });
    else return;
    e.preventDefault();
  }

  function onPanelKey(e: KeyboardEvent) {
    const inSearch = e.target === search.current;
    const move = (index: number) => setActive(Math.max(0, Math.min(shown.length - 1, index)));
    if (e.key === "ArrowDown") move(active + 1);
    else if (e.key === "ArrowUp") move(active - 1);
    else if (e.key === "Home" && !inSearch) move(0);
    else if (e.key === "End" && !inSearch) move(shown.length - 1);
    // Enter in a form would submit it
    else if (e.key === "Enter" || (e.key === " " && !inSearch)) {
      if (shown[active]) choose(shown[active].value);
    } else if (e.key === "Escape") {
      // Only the list closes, not a dialog around it
      e.stopPropagation();
      close();
    } else if (e.key === "Tab" && !open?.sheet) {
      // Not prevented: the focus moves on from the button
      close();
      return;
    } else {
      if (!inSearch && isCharacter(e)) {
        // On phones the character lands in the search field it moves to
        if (searchable) search.current?.focus();
        else setActive(jump(e.key, active));
      }
      return;
    }
    e.preventDefault();
  }

  const panel = (
    <ComboboxPanel
      id={uid}
      label={label}
      options={shown}
      selected={selected}
      active={active}
      query={query}
      searchable={searchable}
      searchRef={search}
      listRef={list}
      onQuery={(next) => {
        setQuery(next);
        setActive(0);
      }}
      onActive={setActive}
      onChoose={choose}
      onKeyDown={onPanelKey}
    />
  );

  return (
    <div className="relative min-w-0">
      {/* The value the form posts and validates. Out of sight, behind the button and its size, so the browser
          scrolls to the field and points its message at it. It lights the button up while it has the focus. */}
      <input
        ref={input}
        name={name}
        value={selected}
        required={required}
        disabled={disabled}
        onChange={(e) => {
          setOwn(e.target.value);
          onChange?.(e.target.value);
        }}
        onKeyDown={() => trigger.current?.focus()}
        tabIndex={-1}
        aria-hidden
        autoComplete="off"
        data-combobox-value
        className="peer pointer-events-none absolute inset-0 w-full opacity-0"
      />
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        aria-label={labelled ? undefined : label}
        aria-haspopup="listbox"
        aria-expanded={Boolean(open)}
        aria-controls={open ? `${uid}-list` : undefined}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onKeyDown={onTriggerKey}
        className={`relative ${inputClass} ${inputHeight(small)} flex cursor-pointer items-center justify-between gap-1 pr-2 text-left peer-focus:border-accent peer-focus:ring-1 peer-focus:ring-accent disabled:cursor-default disabled:opacity-40 ${selected ? "" : "text-muted"}`}
      >
        <span className="min-w-0 truncate">{current?.label ?? placeholder}</span>
        <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4 shrink-0 fill-none stroke-muted" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      {!sheet && popupShown && (
        <div ref={popup} popover="manual" inert={!open} className="motion-popover fixed inset-auto m-0 flex flex-col overflow-hidden rounded-md border border-line2 bg-background p-0 text-foreground shadow-modal">
          {panel}
        </div>
      )}
      {sheet && (
        <Modal
          open={open !== null}
          dialogRef={dialog}
          label={`Pick: ${label}`}
          onClose={() => {
            setOpen(null);
            trigger.current?.focus();
          }}
          scroll={false}
        >
          <div className={`flex flex-col pb-safe ${searchable ? "h-[80dvh]" : "max-h-[80dvh]"}`}>
            <ModalGrabber />
            <ModalHeader title={label} onClose={close} />
            {panel}
          </div>
        </Modal>
      )}
    </div>
  );
}
