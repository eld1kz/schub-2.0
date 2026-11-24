"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { searchPeople, type PersonResult } from "@/app/actions";
import { AWARD_DESCRIPTION_MAX, AWARD_TEAMMATES_MAX, PLACEMENTS, placementLabel, type Award } from "@/lib/awards";
import { FieldError } from "./edit-dialog";
import { nextOnEnter } from "./experience-fields";
import { monthOptions, yearOptions } from "./period-fields";
import { Avatar, Field, FieldLabel, Input, Select, Textarea } from "@/components/ui";

export type AwardOptions = { opportunities: { id: string; title: string }[]; projects: { id: string; title: string }[] };

type Teammate = { id: string; name: string; avatar_url: string; status?: "pending" | "confirmed" };

const placementOptions = PLACEMENTS.map((p) => ({ value: p, label: placementLabel(p) }));
const shownMatches = 6;
const option = "block w-full truncate px-3 py-2 text-left text-base hover:bg-chip focus-visible:bg-chip focus-visible:outline-none";

// Enter in a search box picks its first option instead of moving on
function pickOnEnter(e: KeyboardEvent<HTMLInputElement>, pick: () => void) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  pick();
}

// The add/edit award form: one column, like experience. No `award` starts empty.
export function AwardFields({ award: a, opportunities, projects }: { award?: Award } & AwardOptions) {
  const root = useRef<HTMLDivElement>(null);
  const eventInput = useRef<HTMLInputElement>(null);
  const placementRef = useRef<HTMLSelectElement>(null);
  const monthRef = useRef<HTMLSelectElement>(null);

  // A Schub opportunity ({ id, title }), or a typed-in name (id "")
  const [event, setEvent] = useState(a ? { id: a.opportunity?.id ?? "", title: a.opportunity?.title ?? a.event_name } : null);
  const [eventQuery, setEventQuery] = useState("");
  const [placement, setPlacement] = useState(a?.placement ?? "");
  const [month, setMonth] = useState(a?.awarded_on.slice(5, 7) ?? "");
  const [year, setYear] = useState(a?.awarded_on.slice(0, 4) ?? "");
  const [project, setProject] = useState(a?.project_id ?? "");
  const [teammates, setTeammates] = useState<Teammate[]>(
    (a?.award_teammates ?? []).flatMap((t) => (t.person && t.status !== "declined" ? [{ ...t.person, status: t.status }] : [])),
  );
  const [peopleQuery, setPeopleQuery] = useState("");
  const [people, setPeople] = useState<PersonResult[] | null>(null);
  const [description, setDescription] = useState(a?.description ?? "");

  const q = eventQuery.trim();
  const matches = q ? opportunities.filter((o) => o.title.toLowerCase().includes(q.toLowerCase())).slice(0, shownMatches) : [];
  const thisMonth = new Date().toISOString().slice(0, 7);
  const future = month !== "" && year !== "" && `${year}-${month}` > thisMonth;
  const found = (people ?? []).filter((p) => !teammates.some((t) => t.id === p.id));

  // Save stays off until an event is chosen. Picking one is a click, which the dialog doesn't see,
  // so an input event tells it to check again.
  useEffect(() => {
    eventInput.current?.setCustomValidity(event ? "" : "Choose the event");
    root.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }, [event]);

  useEffect(() => {
    monthRef.current?.setCustomValidity(future ? "Pick a month that has already passed." : "");
  }, [future]);

  // Waits 300ms after the last keystroke; answers to older queries are ignored
  useEffect(() => {
    if (peopleQuery.trim().length < 2) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const results = await searchPeople(peopleQuery);
      if (!stale) setPeople(results);
    }, 300);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [peopleQuery]);

  function chooseEvent(choice: { id: string; title: string }) {
    if (!choice.title) return;
    setEvent(choice);
    setEventQuery("");
    placementRef.current?.focus();
  }

  function addTeammate(person: PersonResult) {
    setTeammates([...teammates, person]);
    setPeopleQuery("");
    setPeople(null);
  }

  return (
    <div ref={root} onKeyDown={nextOnEnter} className="space-y-4 py-6">
      <Field id="award-event" label="Event" required>
        {event ? (
          <div className="flex h-11 items-center justify-between gap-3 rounded-md border border-line2 px-3 sm:h-10">
            <input type="hidden" name="opportunity_id" value={event.id} />
            <input type="hidden" name="event_name" value={event.title} />
            <span className="min-w-0 truncate text-base">{event.title}</span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="hidden text-meta text-muted sm:inline">{event.id ? "On Schub" : "Typed in"}</span>
              <button
                type="button"
                onClick={() => {
                  setEvent(null);
                  setEventQuery(event.title);
                }}
                className="text-sm font-semibold text-accent hover:underline"
              >
                Change
              </button>
            </span>
          </div>
        ) : (
          <>
            <Input
              ref={eventInput}
              id="award-event"
              value={eventQuery}
              onChange={(e) => setEventQuery(e.target.value)}
              onKeyDown={(e) => pickOnEnter(e, () => chooseEvent(matches[0] ?? { id: "", title: q }))}
              placeholder="Search opportunities on Schub"
              autoComplete="off"
            />
            {q && (
              <ul className="mt-1.5 divide-y divide-border overflow-hidden rounded-md border border-line2">
                {matches.map((o) => (
                  <li key={o.id}><button type="button" onClick={() => chooseEvent(o)} className={option}>{o.title}</button></li>
                ))}
                <li>
                  <button type="button" onClick={() => chooseEvent({ id: "", title: q })} className={`${option} font-medium text-accent`}>
                    Use &ldquo;{q}&rdquo; as event name
                  </button>
                </li>
              </ul>
            )}
          </>
        )}
        <FieldError field="event" />
      </Field>

      <Field id="award-placement" label="Placement" required>
        <Select id="award-placement" name="placement" placeholder="Choose a placement" value={placement} onChange={setPlacement} options={placementOptions} selectRef={placementRef} />
        <FieldError field="placement" />
      </Field>

      <Field id="award-prize" label="Prize name">
        <Input id="award-prize" name="prize_name" defaultValue={a?.prize_name} maxLength={100} placeholder="Best use of AI track" />
      </Field>

      <fieldset>
        <FieldLabel as="legend" required>Date</FieldLabel>
        <input type="hidden" name="awarded_on" value={month && year ? `${year}-${month}` : ""} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Month" placeholder="Month" value={month} onChange={setMonth} options={monthOptions} selectRef={monthRef} />
          <Select label="Year" placeholder="Year" value={year} onChange={setYear} options={yearOptions(new Date().getFullYear())} />
        </div>
        <FieldError field="awarded_on" message={future ? "Pick a month that has already passed." : ""} />
      </fieldset>

      <Field id="award-project" label="Project">
        {projects.length > 0 ? (
          <Select id="award-project" name="project_id" placeholder="No project" value={project} onChange={setProject} options={projects.map((p) => ({ value: p.id, label: p.title }))} required={false} />
        ) : (
          <p className="text-sm text-ink2">Add the project to your profile first, then link it here.</p>
        )}
      </Field>

      <div>
        <FieldLabel htmlFor="award-teammates">Teammates</FieldLabel>
        {teammates.length > 0 && (
          <ul className="mb-3 flex flex-col">
            {teammates.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 border-b border-border py-2">
                <input type="hidden" name="teammates" value={t.id} />
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar url={t.avatar_url} name={t.name} size="sm" />
                  <span className="truncate text-base">{t.name || "Unnamed"}</span>
                </span>
                <span className="flex shrink-0 items-center gap-4">
                  {t.status && <span className="text-meta text-muted">{t.status === "confirmed" ? "Confirmed" : "Not confirmed yet"}</span>}
                  <button type="button" onClick={() => setTeammates(teammates.filter((x) => x.id !== t.id))} aria-label={`Remove ${t.name || "teammate"}`} className="text-sm text-ink2 hover:text-foreground">
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {teammates.length < AWARD_TEAMMATES_MAX && (
          <>
            <Input
              id="award-teammates"
              value={peopleQuery}
              onChange={(e) => {
                setPeopleQuery(e.target.value);
                if (e.target.value.trim().length < 2) setPeople(null);
              }}
              onKeyDown={(e) => pickOnEnter(e, () => found[0] && addTeammate(found[0]))}
              placeholder="Search your connections and teammates"
              autoComplete="off"
            />
            {people && (
              <ul className="mt-1.5 divide-y divide-border overflow-hidden rounded-md border border-line2">
                {found.length === 0 && <li className="px-3 py-2 text-sm text-muted">None of your connections or teammates has that name.</li>}
                {found.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => addTeammate(p)} className={`${option} flex items-center gap-2`}>
                      <Avatar url={p.avatar_url} name={p.name} size="sm" />
                      <span className="min-w-0 truncate">
                        {p.name}
                        {p.headline && <span className="text-muted"> · {p.headline}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <p className="mt-1.5 text-meta text-muted">They get a notification, and the award shows on their profile once they confirm.</p>
        <FieldError field="teammates" />
      </div>

      <Field id="award-proof" label="Proof link">
        <Input id="award-proof" name="proof_url" defaultValue={a?.proof_url} placeholder="Announcement or certificate, https://" />
      </Field>

      <Field id="award-description" label="Description">
        <Textarea
          id="award-description"
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={AWARD_DESCRIPTION_MAX}
          placeholder="What you built and what the judges liked."
        />
        <div className="mt-1 flex justify-between gap-4">
          <FieldError field="description" />
          <span className="ml-auto text-meta text-muted tabular-nums">{description.length}/{AWARD_DESCRIPTION_MAX}</span>
        </div>
      </Field>
    </div>
  );
}
