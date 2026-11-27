import { Check } from "lucide-react";
import { Icon } from "./icon";

// What a button shows while it works (Button's `pending`) and right after it worked (`done`)
export function Spinner() {
  return <span aria-hidden className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

export function CheckIcon() {
  return (
    <span data-check className="flex animate-pop">
      <Icon icon={Check} />
    </span>
  );
}
