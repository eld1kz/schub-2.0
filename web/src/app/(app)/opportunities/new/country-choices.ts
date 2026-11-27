import { today } from "@/lib/opportunities";
import { ONLINE, countryOptions } from "@/lib/opportunity-filters";
import type { requireUser } from "@/lib/supabase/server";

// The form's country list: the same as the filter's on /opportunities, counting upcoming events. No country is how an
// online event is saved, so "Online / worldwide" is the empty choice.
export async function countryChoices(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"]) {
  const day = today();
  const { data } = await supabase
    .from("opportunities")
    .select("country, online")
    .eq("status", "live")
    .eq("needs_review", false)
    .or(`deadline.gte.${day},starts_at.gte.${day},and(deadline.is.null,starts_at.is.null)`);
  return countryOptions(data ?? []).map((o) => (o.value === ONLINE ? { ...o, value: "" } : o));
}
