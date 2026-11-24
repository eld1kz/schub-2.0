"use client";

import { useState, useTransition } from "react";
import { fillFromLink } from "@/app/actions";
import type { Prefill } from "@/lib/link-preview";
import { FieldError } from "../../u/[id]/edit-dialog";

const input = "input h-11 sm:h-10";

// The event's link, with "Fill from link" beside it when adding: it reads the page and hands what it found to
// `onFill`. `error` is the server's check of the link on submit.
export function LinkField({ initial, onFill, error }: { initial: string; onFill?: (prefill: Prefill, url: string) => void; error: string }) {
  const [url, setUrl] = useState(initial);
  const [status, setStatus] = useState<{ error?: string; filled?: boolean }>({});
  const [filling, startFill] = useTransition();

  function fill() {
    setStatus({});
    startFill(async () => {
      const result = await fillFromLink(url);
      if (result.prefill) {
        onFill?.(result.prefill, url);
        setStatus({ filled: true });
      } else setStatus({ error: result.error });
    });
  }

  return (
    <div>
      <label htmlFor="url" className="mb-1.5 block text-sm font-medium">
        Link<span aria-hidden className="ml-0.5 text-accent">*</span>
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id="url" name="url" type="url" required placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} className={`${input} min-w-0 flex-1`} />
        {onFill && (
          <button type="button" onClick={fill} disabled={filling || !/^https?:\/\/\S+\.\S+/.test(url)} className="btn-outline h-11 shrink-0 sm:h-10">
            {filling ? "Reading the page..." : "Fill from link"}
          </button>
        )}
      </div>
      <p className="mt-1.5 text-meta text-muted">
        {onFill ? "The official page. Fill from link copies what the page says into the form; check it before adding." : "The official page. We check that it opens."}
      </p>
      {status.filled && <p role="status" className="mt-1.5 text-meta text-accent">Filled from the page. Check every field before adding.</p>}
      {status.error && <p role="alert" className="mt-1.5 text-meta text-danger">{status.error}</p>}
      <FieldError field="url" message={error} />
    </div>
  );
}
