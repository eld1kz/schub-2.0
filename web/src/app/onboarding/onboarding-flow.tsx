"use client";

import { useRef, useState } from "react";
import { completeOnboarding } from "@/app/actions";
import { GOALS } from "@/lib/goals";
import { SkillPicker } from "@/app/(app)/profile/skill-picker";
import { Select } from "@/app/(app)/select";

const years = [2025, 2026, 2027, 2028, 2029, 2030];
const yearOptions = years.map((y) => ({ value: String(y), label: String(y) }));
const steps = [
  { title: "What do you study?", note: "So people know where you are. You can change it later on your profile." },
  { title: "What can you build?", note: "These decide who you get matched with. Pick at least one." },
  { title: "What are you looking for?", note: "Pick any that fit. Teams and people use this to find you." },
];

type Props = { university: string; graduationYear: number; skills: string[]; goals: string[]; error?: string };

function FieldMessage({ text }: { text: string }) {
  return text ? <p role="alert" className="mt-1.5 text-[13px] text-red-600 dark:text-red-400">{text}</p> : null;
}

// One form across three screens: earlier steps are only hidden, so Finish submits everything at once
export function OnboardingFlow({ university, graduationYear, skills, goals, error }: Props) {
  const [step, setStep] = useState(0);
  // A step's own check, shown under the field it's about
  const [problem, setProblem] = useState("");
  const [year, setYear] = useState(years.includes(graduationYear) ? String(graduationYear) : "");
  const form = useRef<HTMLFormElement>(null);
  const last = step === steps.length - 1;

  const next = () => {
    const data = new FormData(form.current ?? undefined);
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
        <p className="font-mono text-xs font-medium tracking-[0.04em] text-muted">STEP {step + 1} OF {steps.length}</p>
        <h1 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] sm:text-4xl sm:tracking-[-0.03em]">{steps[step].title}</h1>
        <p className="text-[15px] text-ink2 sm:text-base">{steps[step].note}</p>
      </div>

      <div className={step === 0 ? "space-y-5" : "hidden"}>
        <div>
          <label htmlFor="university" className="mb-1.5 block text-sm font-medium">
            University<span aria-hidden className="ml-0.5 text-accent">*</span>
          </label>
          <input id="university" name="university" defaultValue={university} autoFocus placeholder="Korea University" className="input h-11 sm:h-10" />
          {step === 0 && <FieldMessage text={problem} />}
        </div>
        <div>
          <label htmlFor="graduation_year" className="mb-1.5 block text-sm font-medium">
            Graduation year <span className="font-normal text-muted">(optional)</span>
          </label>
          <Select id="graduation_year" name="graduation_year" placeholder="Select a year" value={year} onChange={setYear} options={yearOptions} required={false} />
        </div>
      </div>

      <div className={step === 1 ? "[&_input[type=search]]:h-11 sm:[&_input[type=search]]:h-10" : "hidden"}>
        <label htmlFor="skills" className="mb-1.5 block text-sm font-medium">
          Your skills<span aria-hidden className="ml-0.5 text-accent">*</span>
        </label>
        <SkillPicker id="skills" defaultValue={skills} />
        {step === 1 && <FieldMessage text={problem} />}
      </div>

      <fieldset className={step === 2 ? "flex flex-col gap-2.5" : "hidden"}>
        <legend className="sr-only">What you&apos;re looking for</legend>
        {GOALS.map((g) => (
          <label
            key={g}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-line2 px-4 py-3 text-[15px] transition-colors hover:border-muted has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
          >
            <input type="checkbox" name="goals" value={g} defaultChecked={goals.includes(g)} className="h-[18px] w-[18px] shrink-0 accent-[var(--accent)]" />
            {g}
          </label>
        ))}
      </fieldset>

      {error && <p role="alert" className="pt-5 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Phones: pinned to the bottom with a full-width main button */}
      <div className="fixed inset-x-0 bottom-0 flex items-center gap-4 border-t border-border bg-background px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:static sm:mt-8 sm:px-0 sm:pb-0 sm:pt-5">
        {step > 0 && <button type="button" onClick={back} className="text-[15px] text-ink2 hover:text-foreground">Back</button>}
        {last ? (
          <button className="btn ml-auto h-11 flex-1 sm:h-[38px] sm:flex-none">Finish</button>
        ) : (
          <button type="button" onClick={next} className="btn ml-auto h-11 flex-1 sm:h-[38px] sm:flex-none">Next</button>
        )}
      </div>
    </form>
  );
}
