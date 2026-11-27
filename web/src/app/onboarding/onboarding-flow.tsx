"use client";

import { useRef, useState } from "react";
import { completeOnboarding } from "@/app/actions";
import { GOALS } from "@/lib/goals";
import { LANGUAGES } from "@/lib/languages";
import { SkillPicker } from "@/app/(app)/profile/skill-picker";
import { CheckChip, Combobox, ErrorText, FieldLabel, Input, buttonClass, SubmitButton } from "@/components/ui";

const years = [2025, 2026, 2027, 2028, 2029, 2030];
const yearOptions = years.map((y) => ({ value: String(y), label: String(y) }));
// The first step asks for a name too when the account doesn't have one
const aboutYou = { title: "About you", note: "Your name and where you study. You can change both later on your profile." };
const noName = "Add your name to continue.";
const steps = [
  { title: "What do you study?", note: "So people know where you are and which languages you work in. You can change it later on your profile." },
  { title: "What can you build?", note: "These decide who you get matched with. Pick at least one." },
  { title: "What are you looking for?", note: "Pick any that fit. Teams and people use this to find you." },
];

type Props = { needsName: boolean; university: string; graduationYear: number; skills: string[]; goals: string[]; languages: string[]; error?: string };

function FieldMessage({ text }: { text: string }) {
  return text ? <ErrorText under>{text}</ErrorText> : null;
}

// One form across three screens: earlier steps are only hidden, so Finish submits everything at once
export function OnboardingFlow({ needsName, university, graduationYear, skills, goals, languages, error }: Props) {
  const [step, setStep] = useState(0);
  // A step's own check, shown under the field it's about
  const [problem, setProblem] = useState("");
  const [year, setYear] = useState(years.includes(graduationYear) ? String(graduationYear) : "");
  const form = useRef<HTMLFormElement>(null);
  const last = step === steps.length - 1;
  const current = step === 0 && needsName ? aboutYou : steps[step];

  const next = () => {
    const data = new FormData(form.current ?? undefined);
    if (step === 0 && needsName && !String(data.get("name") ?? "").trim()) return setProblem(noName);
    if (step === 0 && !String(data.get("university") ?? "").trim()) return setProblem("Add your university to continue.");
    if (step === 1 && data.getAll("skills").length === 0) return setProblem("Pick at least one skill to continue.");
    setProblem("");
    setStep(step + 1);
  };
  const back = () => {
    setProblem("");
    setStep(step - 1);
  };

  return (
    <form
      ref={form}
      action={completeOnboarding}
      // Enter moves to the next step instead of submitting early; the skill search handles its own Enter
      onKeyDown={(e) => {
        if (e.key !== "Enter" || last || e.defaultPrevented || !(e.target instanceof HTMLInputElement)) return;
        e.preventDefault();
        next();
      }}
      // Any click or typing clears the last step's message. Capture runs before Next's own check, so that can set it again.
      onClickCapture={() => setProblem("")}
      onInput={() => setProblem("")}
      className="flex flex-col"
    >
      <div className="flex flex-col gap-3 pb-8">
        <div className="flex gap-1.5" aria-hidden>
          {steps.map((s, i) => <span key={s.title} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-line2"}`} />)}
        </div>
        <p className="font-mono text-xs font-medium tracking-wide text-muted">STEP {step + 1} OF {steps.length}</p>
        <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl sm:tracking-tighter">{current.title}</h1>
        <p className="text-base text-ink2">{current.note}</p>
      </div>

      <div className={step === 0 ? "space-y-4" : "hidden"}>
        {needsName && (
          <div>
            <FieldLabel htmlFor="name" required>Name</FieldLabel>
            <Input id="name" name="name" maxLength={80} autoFocus autoComplete="name" placeholder="Your full name" />
            {step === 0 && problem === noName && <FieldMessage text={problem} />}
          </div>
        )}
        <div>
          <FieldLabel htmlFor="university" required>University</FieldLabel>
          <Input id="university" name="university" defaultValue={university} maxLength={120} autoFocus={!needsName} placeholder="Korea University" />
          {step === 0 && problem !== noName && <FieldMessage text={problem} />}
        </div>
        <div>
          <FieldLabel htmlFor="graduation_year" optional>Graduation year</FieldLabel>
          <Combobox id="graduation_year" label="Graduation year" labelled name="graduation_year" placeholder="Select a year" value={year} onChange={setYear} options={yearOptions} required={false} />
        </div>
        <fieldset>
          <FieldLabel as="legend" optional>Languages you work in</FieldLabel>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {LANGUAGES.map((l) => (
              <CheckChip key={l} name="languages" value={l} defaultChecked={languages.includes(l)}>{l}</CheckChip>
            ))}
          </div>
        </fieldset>
      </div>

      <div className={step === 1 ? "[&_input[type=search]]:h-11 sm:[&_input[type=search]]:h-10" : "hidden"}>
        <FieldLabel htmlFor="skills" required>Your skills</FieldLabel>
        <SkillPicker id="skills" defaultValue={skills} />
        {step === 1 && <FieldMessage text={problem} />}
      </div>

      <fieldset className={step === 2 ? "flex flex-col gap-2" : "hidden"}>
        <legend className="sr-only">What you&apos;re looking for</legend>
        {GOALS.map((g) => (
          <label
            key={g}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-line2 px-4 py-3 text-base transition-colors hover:border-muted has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
          >
            <input type="checkbox" name="goals" value={g} defaultChecked={goals.includes(g)} className="h-4.5 w-4.5 shrink-0 accent-accent" />
            {g}
          </label>
        ))}
      </fieldset>

      {error && <ErrorText size="sm" className="pt-4">{error}</ErrorText>}

      {/* Phones: pinned to the bottom with a full-width main button */}
      <div className="fixed inset-x-0 bottom-0 flex items-center gap-4 border-t border-border bg-background px-4 py-4 pb-safe-4 sm:static sm:mt-8 sm:px-0 sm:pb-0 sm:pt-4">
        {step > 0 && <button type="button" onClick={back} className="text-base text-ink2 hover:text-foreground">Back</button>}
        {last ? (
          <SubmitButton size="touch" className="ml-auto flex-1 sm:flex-none">Finish</SubmitButton>
        ) : (
          <button type="button" onClick={next} className={`${buttonClass({ size: "touch" })} ml-auto flex-1 sm:flex-none`}>Next</button>
        )}
      </div>
    </form>
  );
}
