"use client";

import { useState, useTransition } from "react";
import { fillFromLink } from "@/app/actions";
import type { Prefill } from "@/lib/link-preview";
import { FieldError } from "../../u/[id]/edit-dialog";
import { ErrorText, FieldLabel, Input, Button } from "@/components/ui";

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
      <FieldLabel htmlFor="url" required>Link</FieldLabel>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input large id="url" name="url" type="url" required placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} className="min-w-0 flex-1" />
        {onFill && (
          <Button type="button" variant="secondary" size="lg" onClick={fill} pending={filling} disabled={!/^https?:\/\/\S+\.\S+/.test(url)}>
            Fill from link
          </Button>
        )}
      </div>
      <p className="mt-1.5 text-meta text-muted">
        {onFill ? "The official page. Fill from link copies what the page says into the form; check it before adding." : "The official page. We check that it opens."}
      </p>
      {status.filled && <p role="status" className="mt-1.5 text-meta text-accent">Filled from the page. Check every field before adding.</p>}
      {status.error && <ErrorText under>{status.error}</ErrorText>}
      <FieldError field="url" message={error} />
    </div>
  );
}
