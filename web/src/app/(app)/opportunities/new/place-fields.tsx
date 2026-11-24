"use client";

import { useState } from "react";
import { LANGUAGES } from "@/lib/languages";
import { ELIGIBILITY } from "@/lib/opportunities";
import { Select } from "../../select";
import { FieldError } from "../../u/[id]/edit-dialog";

const input = "input h-11 sm:h-10";
const label = "mb-1.5 block text-sm font-medium";
const optional = <span className="font-normal text-muted"> (optional)</span>;
const eligibilityOptions = Object.entries(ELIGIBILITY).map(([value, text]) => ({ value, label: text }));

export type Option = { value: string; label: string };
export type PlaceValues = { city: string; country: string; online: boolean; languages: string[]; eligibility: string; eligibility_note: string };

// Where it happens, the languages it runs in, and who can join. A country restriction is to the country above.
// `countries` comes from the server (COUNTRY_OPTIONS): browsers name some countries differently from Node's Intl, which
// broke hydration when the list was built on both sides.
export function PlaceFields({ initial, countries, countryError }: { initial: PlaceValues; countries: Option[]; countryError: string }) {
  const [country, setCountry] = useState(initial.country);
  const [eligibility, setEligibility] = useState(initial.eligibility || "anyone");

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
        <div>
          <label htmlFor="city" className={label}>City{optional}</label>
          <input id="city" name="city" maxLength={80} defaultValue={initial.city} placeholder="Seoul" className={input} />
        </div>
        <div>
          <label htmlFor="country" className={label}>Country{optional}</label>
          <Select id="country" name="country" placeholder="No country (online)" value={country} onChange={setCountry} options={countries} required={false} />
          <FieldError field="country" message={countryError} />
        </div>
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-ink2">
        <input type="checkbox" name="online" defaultChecked={initial.online} className="peer sr-only" />
        <span
          aria-hidden
          className="relative h-5 w-9 rounded-full bg-line2 transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-background after:transition-transform peer-checked:after:translate-x-4"
        />
        Online
      </label>

      <fieldset>
        <legend className={label}>Languages <span className="font-normal text-muted">(optional, one or more)</span></legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {LANGUAGES.map((l) => (
            <label
              key={l}
              className="flex min-h-10 cursor-pointer items-center justify-center rounded-md border border-line2 px-2 py-2 text-center text-sm text-ink2 transition-colors hover:border-muted has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
            >
              <input type="checkbox" name="languages" value={l} defaultChecked={initial.languages.includes(l)} className="sr-only" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="eligibility" className={label}>Who can join</label>
        <Select id="eligibility" name="eligibility" placeholder="Anyone" value={eligibility} onChange={setEligibility} options={eligibilityOptions} />
        {eligibility === "country" && !country && <p className="mt-1.5 text-meta text-muted">Pick the country above.</p>}
        {eligibility !== "anyone" && (
          <input
            name="eligibility_note"
            aria-label="Who can join, in more detail"
            maxLength={300}
            defaultValue={initial.eligibility_note}
            placeholder={eligibility === "students" ? "Undergraduates in any field" : "Residents of Korea, any nationality"}
            className={`${input} mt-2`}
          />
        )}
      </div>
    </>
  );
}
