"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ActionButton, AnswerButtons, Avatar, Button, CommandPalette, HoverCard, Pop, Tabs, ToastProvider, useToast, type ButtonVariant } from "@/components/ui";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// Stand-ins for server actions: one that works and one the server turns down
const works = async () => (await wait(900), {});
const fails = async () => (await wait(900), { error: "You can send up to 20 connection requests a day." });

// Press it to see loading, then the check, then idle again
export function LoadingDemo({ variant }: { variant: ButtonVariant }) {
  const [saved, setSaved] = useState(false);
  const [saving, start] = useTransition();
  function save() {
    start(async () => {
      await wait(1200);
      setSaved(true);
      await wait(900);
      setSaved(false);
    });
  }
  return <Button type="button" variant={variant} pending={saving && !saved} done={saved} onClick={save}>Save changes</Button>;
}

// Connect → check → Pending, or back with the reason
export function ConnectDemo({ fail = false }: { fail?: boolean }) {
  const [sent, setSent] = useState(false);
  if (sent) return <Button type="button" variant="quiet" size="sm" onClick={() => setSent(false)}>Pending (press to reset)</Button>;
  return (
    <ActionButton variant="secondary" size="sm" action={async () => { const result = await (fail ? fails() : works()); if (!fail) setSent(true); return result; }}>
      {fail ? "Connect (fails)" : "Connect"}
    </ActionButton>
  );
}

export function AnswerDemo() {
  return <AnswerButtons accept={works} decline={fails} />;
}

export function PopDemo() {
  const [count, setCount] = useState(2);
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium">People<Pop value={count} className="ml-1 font-semibold text-accent tabular-nums" /></span>
      <Button type="button" variant="secondary" size="sm" onClick={() => setCount(count + 1)}>New request</Button>
    </div>
  );
}

// Tabs that switch in place, to watch the line slide
export function TabsDemo() {
  const [current, setCurrent] = useState("Discover");
  return (
    <div
      onClickCapture={(e) => {
        const link = (e.target as HTMLElement).closest("a");
        if (!link) return;
        e.preventDefault();
        setCurrent(link.textContent ?? "");
      }}
    >
      <Tabs label="Sliding tabs" tabs={["Discover", "Requests", "Connections"].map((label) => ({ href: `/design?tab=${label}`, label, current: label === current }))} />
    </div>
  );
}

function ToastButton() {
  const toast = useToast();
  return <Button type="button" variant="secondary" onClick={() => toast("Profile saved")}>Show a toast</Button>;
}

export function ToastDemo({ children }: { children?: ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex flex-wrap items-center gap-3">
        <ToastButton />
        {children}
      </div>
    </ToastProvider>
  );
}

// A person preview with sample content; in the app PersonLink loads it
export function HoverDemo() {
  return (
    <p className="text-base text-ink2">
      Rest the mouse on{" "}
      <HoverCard
        card={
          <div className="flex w-72 items-center gap-3 rounded-lg border border-line2 bg-background p-4 shadow-float">
            <Avatar url="" name="Jiwoo Park" size="xl" ring="open" />
            <span className="min-w-0 flex-1 text-base font-semibold">Jiwoo Park</span>
            <ConnectDemo />
          </div>
        }
      >
        <a href="#hover" className="font-semibold text-accent">a person</a>
      </HoverCard>{" "}
      or Tab to them.
    </p>
  );
}

export function PaletteDemo() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const options = [{ value: "teams", label: "Teams", group: "Go to" }, { value: "people", label: "People", group: "Go to" }].filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <div>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>Open the palette</Button>
      <CommandPalette open={open} onClose={() => setOpen(false)} label="examples" query={query} onQuery={setQuery} options={options} onChoose={() => setOpen(false)} />
    </div>
  );
}
