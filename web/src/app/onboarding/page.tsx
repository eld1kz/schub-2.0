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
  const { data: p } = await supabase.from("profiles").select("university, graduation_year, skills, goals").eq("id", userId).maybeSingle();

  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-10 sm:items-center">
      <div className="w-full max-w-md rounded-lg border border-border p-6">
        <OnboardingFlow
          university={p?.university ?? ""}
          graduationYear={p?.graduation_year ?? 0}
          skills={knownSkills(p?.skills ?? [])}
          goals={knownGoals(p?.goals ?? [])}
          error={typeof error === "string" ? error : undefined}
        />
      </div>
    </main>
  );
}
