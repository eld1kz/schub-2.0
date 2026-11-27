"use client";

import { useLayoutEffect, useRef } from "react";

// The line under the current tab, sliding to the new one. Put it inside the tabs' own `relative` element, whose
// current link has aria-current="page" and draws shadow-tab itself; once this has measured it, the parent's
// data-slides turns that off and this line shows instead.
export function TabUnderline() {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const line = ref.current;
    const list = line?.parentElement;
    if (!line || !list) return;
    let frame = 0;
    const place = () => {
      const current = list.querySelector<HTMLElement>('[aria-current="page"]');
      if (!current?.offsetWidth) {
        delete list.dataset.slides;
        delete line.dataset.ready;
        return;
      }
      const tab = current.getBoundingClientRect();
      const box = list.getBoundingClientRect();
      line.style.width = `${tab.width}px`;
      line.style.translate = `${tab.left - box.left + list.scrollLeft}px ${tab.bottom - box.top - line.offsetHeight}px`;
      list.dataset.slides = "";
      // The first time it's simply there; it slides from then on
      line.getBoundingClientRect();
      frame = requestAnimationFrame(() => (line.dataset.ready = ""));
    };
    place();
    const resized = new ResizeObserver(place);
    resized.observe(list);
    const changed = new MutationObserver(place);
    changed.observe(list, { subtree: true, childList: true, characterData: true, attributeFilter: ["aria-current"] });
    return () => {
      cancelAnimationFrame(frame);
      resized.disconnect();
      changed.disconnect();
    };
  }, []);

  return <span ref={ref} aria-hidden className="pointer-events-none absolute top-0 left-0 hidden h-0.5 bg-accent [[data-slides]>&]:block data-ready:transition-[translate,width] data-ready:duration-200 data-ready:ease-out" />;
}
