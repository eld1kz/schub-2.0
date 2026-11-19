import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { localPath, safeRedirect } from "@/lib/redirect";

// Providers and email links send people back here; the code becomes the session cookie
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const supabase = await createClient();
  const { data, error } = code ? await supabase.auth.exchangeCodeForSession(code) : { data: { user: null }, error: true };
  // No code means the provider refused or the email link had expired: back to /login with a message
  if (error || !data.user) {
    return NextResponse.redirect(new URL(`/login?error=1&next=${encodeURIComponent(localPath(searchParams.get("next")))}`, origin));
  }
  // A profile with no university, skills or bio is new: onboarding first
  const { data: p } = await supabase.from("profiles").select("university, skills, bio").eq("id", data.user.id).maybeSingle();
  if (p && !p.university && p.skills.length === 0 && !p.bio) return NextResponse.redirect(new URL("/onboarding", origin));
  // Back to where they started, but only on this site
  return NextResponse.redirect(safeRedirect(searchParams.get("next"), origin));
}
