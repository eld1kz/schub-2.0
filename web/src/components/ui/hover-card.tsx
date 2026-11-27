"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLinger } from "./use-linger";

// How long the pointer rests before it opens, and how long it has to reach the card before it closes
const OPEN_AFTER = 350;
const CLOSE_AFTER = 150;

const focusable = "a[href], button:not(:disabled)";

// A preview that opens beside a link (a person's name or avatar) when a mouse rests on it or the keyboard focuses
// it. Touch screens just follow the link. Tab moves from the link into the card and back out; Escape closes it.
// The card is drawn at the end of the page (or of the dialog the link is in), so it can't disturb the row or the
// sentence around the link. `onOpen`: load what it shows.
export function HoverCard({ card, onOpen, children }: { card: ReactNode; onOpen?: () => void; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState<Element | null>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const shown = useLinger(open, panel);

  function later(next: boolean) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (next) {
        setHost(anchor.current?.closest("dialog") ?? document.body);
        onOpen?.();
      }
      setOpen(next);
    }, next ? OPEN_AFTER : CLOSE_AFTER);
  }
  useEffect(() => () => clearTimeout(timer.current), []);

  // In the top layer, under the link, or over it when there's more room there
  useEffect(() => {
    const box = panel.current;
    // The wrapper has no box of its own
    const link = anchor.current?.firstElementChild;
    if (!open || !box || !link) return;
    box.showPopover();
    const place = () => {
      const at = link.getBoundingClientRect();
      const up = window.innerHeight - at.bottom < box.offsetHeight + 12 && at.top > window.innerHeight - at.bottom;
      box.style.left = `${Math.max(8, Math.min(at.left, window.innerWidth - box.offsetWidth - 8))}px`;
      box.style.top = up ? "auto" : `${at.bottom + 8}px`;
      box.style.bottom = up ? `${window.innerHeight - at.top + 8}px` : "auto";
      box.style.transformOrigin = up ? "bottom left" : "top left";
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      if (box.isConnected) box.hidePopover();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  function onKeyDown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      clearTimeout(timer.current);
      setOpen(false);
      return;
    }
    if (e.key !== "Tab") return;
    const link = anchor.current?.firstElementChild as HTMLElement | null;
    const inside = [...(panel.current?.querySelectorAll<HTMLElement>(focusable) ?? [])];
    const at = inside.indexOf(e.target as HTMLElement);
    if (at === -1 && !e.shiftKey && inside[0]) {
      e.preventDefault();
      inside[0].focus();
    } else if (at === 0 && e.shiftKey) {
      e.preventDefault();
      link?.focus();
    } else if (at === inside.length - 1 && !e.shiftKey) {
      // Not prevented: the focus moves on from the link
      link?.focus();
    }
  }

  return (
    <span
      ref={anchor}
      className="contents"
      onPointerEnter={(e) => e.pointerType === "mouse" && later(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && later(false)}
      onFocus={(e) => e.target.matches(":focus-visible") && later(true)}
      onBlur={(e) => {
        const next = e.relatedTarget;
        if (!e.currentTarget.contains(next) && !panel.current?.contains(next)) later(false);
      }}
      onFocusCapture={() => open && clearTimeout(timer.current)}
      onKeyDown={onKeyDown}
    >
      {children}
      {shown && host && createPortal(
        <div ref={panel} popover="manual" inert={!open} className="motion-popover fixed inset-auto m-0 overflow-visible bg-transparent p-0 text-left text-foreground">
          {card}
        </div>,
        host,
      )}
    </span>
  );
}
