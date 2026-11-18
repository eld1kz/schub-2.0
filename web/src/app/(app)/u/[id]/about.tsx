"use client";

import { useEffect, useRef, useState } from "react";

// The bio, cut to 3 lines with a toggle when it runs longer
export function About({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [long, setLong] = useState(false);
  const [open, setOpen] = useState(false);

  // Measured once while clamped; the browser decides how many lines the text takes
  useEffect(() => {
    const el = ref.current;
    if (el) setLong(el.scrollHeight > el.clientHeight);
  }, [text]);

  return (
    <div>
      <p ref={ref} className={`whitespace-pre-wrap ${open ? "" : "line-clamp-3"}`}>{text}</p>
      {long && (
        <button type="button" onClick={() => setOpen(!open)} className="mt-1 text-sm font-medium text-accent hover:underline">
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
