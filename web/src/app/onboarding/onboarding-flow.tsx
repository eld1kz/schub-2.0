"use client";

import { useRef, useState } from "react";
import { completeOnboarding } from "@/app/actions";
import { GOALS } from "@/lib/goals";
import { SkillPicker } from "@/app/(app)/profile/skill-picker";

const years = [2025, 2026, 2027, 2028, 2029, 2030];
const titles = ["What do you study?", "What can you build?", "What are you looking for?"];

type Props = { university: string; graduationYear: number; skills: string[]; goals: string[]; error?: string };

// One form across three screens: earlier steps are only hidden, so Finish submits everything at once
export function OnboardingFlow({ university, graduationYear, skills, goals, error }: Props) {
  const [step, setStep] = useState(0);
  const [problem, setProblem] = useState(error ?? "");
  const form = useRef<HTMLFormElement>(null);

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
        if (e.key !== "Enter" || step === 2 || e.defaultPrevented || !(e.target instanceof HTMLInputElement)) return;
        e.preventDefault();
        next();
      }}
      className="space-y-6"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2" aria-hidden>
          {titles.map((t, i) => <span key={t} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-indigo-500" : "bg-border"}`} />)}
        </div>
        <p className="text-xs text-muted">Step {step + 1} of 3</p>
        <h1 className="text-xl font-semibold tracking-tight">{titles[step]}</h1>
      </div>

      <div className={step === 0 ? "space-y-4" : "hidden"}>
        <div><label className="label" htmlFor="university">University</label><input id="university" name="university" defaultValue={university} autoFocus className="input" /></div>
        <div>
          <label className="label" htmlFor="graduation_year">Graduation year</label>
          <select id="graduation_year" name="graduation_year" defaultValue={years.includes(graduationYear) ? graduationYear : ""} className="input">
            <option value="">Select a year</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className={step === 1 ? "space-y-2" : "hidden"}>
        <label className="label" htmlFor="skills">Pick what you&apos;re good at</label>
        <SkillPicker id="skills" defaultValue={skills} />
      </div>

      <fieldset className={step === 2 ? "space-y-2" : "hidden"}>
        <legend className="label">Pick any that fit</legend>
        {GOALS.map((g) => (
          <label key={g} className="flex items-center gap-3 rounded-md border border-border p-3 text-sm has-[:checked]:border-indigo-500">
            <input type="checkbox" name="goals" value={g} defaultChecked={goals.includes(g)} />
            {g}
          </label>
        ))}
      </fieldset>

      {problem && <p className="text-sm text-red-600 dark:text-red-400">{problem}</p>}

      <div className="flex justify-between gap-3">
        {step > 0 ? <button type="button" onClick={back} className="btn-outline">Back</button> : <span />}
        {step < 2 ? <button type="button" onClick={next} className="btn">Next</button> : <button className="btn">Finish</button>}
      </div>
    </form>
  );
}
