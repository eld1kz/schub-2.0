"use client";

import { useEffect } from "react";

const rowOf = (node: EventTarget | null) => (node instanceof Element ? node.closest<HTMLElement>("[data-row]") : null);

// Runs the linked rows of the whole app: one of them is active (data-active), the one under the mouse or else the one
// with the focus. Up and Down move the focus along a list from a focused row; Enter then follows its link.
export function RowKeys() {
  useEffect(() => {
    let active: HTMLElement | null = null;
    const set = (row: HTMLElement | null) => {
      if (row === active) return;
      active?.removeAttribute("data-active");
      row?.setAttribute("data-active", "");
      active = row;
    };
    const over = (e: PointerEvent) => e.pointerType === "mouse" && set(rowOf(e.target) ?? rowOf(document.activeElement));
    const focus = (e: FocusEvent) => set((e.target as Element).matches(":focus-visible") ? rowOf(e.target) : null);
    const key = (e: KeyboardEvent) => {
      const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
      const target = e.target as Element;
      const row = rowOf(target);
      // Only from a row's links and buttons, so fields, dropdowns and page scrolling keep their arrows
      if (!step || !row || !target.matches("a, button:not([role=combobox])") || e.altKey || e.ctrlKey || e.metaKey) return;
      const rows = [...(row.parentElement?.querySelectorAll<HTMLElement>(":scope > [data-row]") ?? [])];
      const next = rows[rows.indexOf(row) + step]?.querySelector<HTMLElement>("[data-row-main]");
      if (!next) return;
      e.preventDefault();
      next.focus();
    };
    document.addEventListener("pointerover", over);
    document.addEventListener("focusin", focus);
    document.addEventListener("keydown", key);
    return () => {
      set(null);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("keydown", key);
    };
  }, []);
  return null;
}
