"use client";

import { useToast } from "./toast";
import { buttonClass } from "@/components/ui";

export function CopyLinkButton({ path }: { path: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(`${location.origin}${path}`).then(
          () => toast("Link copied"),
          () => toast("Couldn't copy the link"),
        )
      }
      className={buttonClass({ variant: "secondary" })}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
      </svg>
      Copy profile link
    </button>
  );
}
