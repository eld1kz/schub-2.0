import { requireUser } from "@/lib/supabase/server";
import { SignInPrompt } from "../../sign-in";
import { countryChoices } from "./country-choices";
import { OpportunityForm } from "./opportunity-form";

export const instant = false;

export default async function NewOpportunityPage() {
  const { supabase, isGuest } = await requireUser();
  if (isGuest) return <SignInPrompt text="Sign in to add an opportunity." />;
  return <OpportunityForm countries={await countryChoices(supabase)} />;
}
