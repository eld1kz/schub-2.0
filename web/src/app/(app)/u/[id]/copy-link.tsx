"use client";

import { Link as LinkIcon } from "lucide-react";
import { buttonClass, useToast, Icon } from "@/components/ui";

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
      <Icon icon={LinkIcon} />
      Copy profile link
    </button>
  );
}
