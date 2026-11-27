import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { knownSkills } from "@/lib/skills";
import { knownGoals } from "@/lib/goals";
import { knownLanguages } from "@/lib/languages";
import { OnboardingFlow } from "./onboarding-flow";

// Outside the (app) group, so there's no nav. New Google accounts land here from /auth/callback.
export const instant = false;

export default async function OnboardingPage(props: PageProps<"/onboarding">) {
  const { error } = await props.searchParams;
  const { supabase, userId, isGuest } = await requireUser();
  if (isGuest) redirect("/opportunities");
  const { data: p } = await supabase.from("profiles").select("name, university, graduation_year, skills, goals, languages").eq("id", userId).maybeSingle();

  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex h-15 max-w-wide items-center px-4 sm:px-12">
          <span className="flex items-center gap-2 text-xl font-bold tracking-tighter">
            <span aria-hidden className="h-3 w-3 rounded-sm bg-accent" />
            schub
          </span>
        </div>
      </header>
      {/* Room at the bottom on phones for the pinned buttons */}
      <main className="mx-auto w-full max-w-form px-4 pt-8 pb-bar sm:pt-16 sm:pb-16">
        <OnboardingFlow
          // Email sign-ups (and providers without a display name) arrive with no name
          needsName={!p?.name.trim()}
          university={p?.university ?? ""}
          graduationYear={p?.graduation_year ?? 0}
          skills={knownSkills(p?.skills ?? [])}
          goals={knownGoals(p?.goals ?? [])}
          languages={knownLanguages(p?.languages ?? [])}
          error={typeof error === "string" ? error : undefined}
        />
      </main>
    </>
  );
}
