import { Icon } from "@/components/ui";
import { Medal } from "lucide-react";

// A small medal after a name in People and Teams rows: the person has at least one award
export function AwardMark() {
  return (
    <span title="Has an award" className="inline-flex shrink-0 align-icon text-accent">
      <Icon icon={Medal} />
      <span className="sr-only">Has an award</span>
    </span>
  );
}
