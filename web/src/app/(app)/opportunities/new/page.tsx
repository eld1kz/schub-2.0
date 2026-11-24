import { COUNTRY_OPTIONS } from "@/lib/countries";
import { requireUser } from "@/lib/supabase/server";
import { SignInPrompt } from "../../sign-in";
import { OpportunityForm } from "./opportunity-form";

export const instant = false;

export default async function NewOpportunityPage() {
  const { isGuest } = await requireUser();
  if (isGuest) return <SignInPrompt text="Sign in to add an opportunity." />;
  return <OpportunityForm countries={COUNTRY_OPTIONS} />;
}
