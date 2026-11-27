"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { searchGlobal, type SearchResults } from "@/app/actions";
import { CommandPalette, Icon, Kbd, type ComboboxOption } from "@/components/ui";

const pages = [
  { value: "/opportunities", label: "Opportunities" },
  { value: "/teams", label: "Teams" },
  { value: "/teams/mine", label: "Your teams" },
  { value: "/people", label: "People" },
  { value: "/people/requests", label: "Connection requests" },
  { value: "/people/connections", label: "Connections" },
  { value: "/profile", label: "Your profile" },
  { value: "/teams/new", label: "Post a team" },
  { value: "/settings", label: "Settings" },
];

// The server doesn't know the keyboard, so it says Ctrl until the browser says otherwise
const never = () => () => {};
const useMac = () => useSyncExternalStore(never, () => /Mac|iPhone|iPad/.test(navigator.platform), () => false);

// The nav's search and ⌘K (Ctrl K): jump to a page, or find people, teams and events by name
export function GlobalSearch() {
  const router = useRouter();
  const mac = useMac();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);

  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      e.preventDefault();
      setOpen(true);
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);

  // Waits 300ms after the last keystroke; answers to older queries are ignored
  useEffect(() => {
    if (query.trim().length < 2) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const found = await searchGlobal(query);
      if (!stale) setResults(found);
    }, 300);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query]);

  const q = query.trim().toLowerCase();
  const found = q.length >= 2 ? results : null;
  const options: ComboboxOption[] = [
    ...(found?.people.map((p) => ({ value: `/u/${p.id}`, label: p.name, group: "People" })) ?? []),
    ...(found?.teams.map((t) => ({ value: `/teams/${t.id}`, label: t.title, group: "Teams" })) ?? []),
    ...(found?.events.map((e) => ({ value: `/opportunities/${e.id}`, label: e.title, group: "Events" })) ?? []),
    ...pages.filter((p) => p.label.toLowerCase().includes(q)).map((p) => ({ ...p, group: "Go to" })),
  ];

  const close = () => {
    setOpen(false);
    setQuery("");
    setResults(null);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Search or jump to"
        aria-keyshortcuts="Meta+K Control+K"
        onClick={() => setOpen(true)}
        className="pressable flex items-center gap-2 text-muted hover:text-foreground sm:h-9 sm:w-75 sm:rounded-md sm:border sm:border-line2 sm:bg-surface sm:px-3 sm:text-sm sm:hover:border-foreground"
      >
        <Icon icon={Search} />
        <span className="hidden flex-1 text-left sm:inline">Search or jump to</span>
        <Kbd>{mac ? "⌘K" : "Ctrl K"}</Kbd>
      </button>
      <CommandPalette
        open={open}
        onClose={close}
        label="people, teams and events"
        query={query}
        onQuery={setQuery}
        options={options}
        onChoose={(href) => {
          close();
          router.push(href);
        }}
      />
    </>
  );
}
