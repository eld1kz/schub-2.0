import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { knownSkills } from "@/lib/skills";
import { knownGoals } from "@/lib/goals";
import { OnboardingFlow } from "./onboarding-flow";

// Outside the (app) group, so there's no nav. New Google accounts land here from /auth/callback.
export const instant = false;

export default async function OnboardingPage(props: PageProps<"/onboarding">) {
  const { error } = await props.searchParams;
  const { supabase, userId, isGuest } = await requireUser();
  if (isGuest) redirect("/opportunities");
  const { data: p } = await supabase.from("profiles").select("name, university, graduation_year, skills, goals").eq("id", userId).maybeSingle();

  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex h-[60px] max-w-[1440px] items-center px-4 sm:px-12">
          <span className="flex items-center gap-2 text-xl font-bold tracking-[-0.03em]">
            <span aria-hidden className="h-3 w-3 rounded-[2px] bg-accent" />
            schub
          </span>
        </div>
      </header>
      {/* Room at the bottom on phones for the pinned buttons */}
      <main className="mx-auto w-full max-w-[560px] px-4 pt-10 pb-32 sm:pt-16 sm:pb-16">
        <OnboardingFlow
          // Email sign-ups (and providers without a display name) arrive with no name
          needsName={!p?.name.trim()}
          university={p?.university ?? ""}
          graduationYear={p?.graduation_year ?? 0}
          skills={knownSkills(p?.skills ?? [])}
          goals={knownGoals(p?.goals ?? [])}
          error={typeof error === "string" ? error : undefined}
        />
      </main>
    </>
  );
}
