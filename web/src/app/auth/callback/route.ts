import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/redirect";

// Google sends people back here after sign-in; the code becomes the session cookie
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    // A profile with no university, skills or bio is new: onboarding first
    if (data.user) {
      const { data: p } = await supabase.from("profiles").select("university, skills, bio").eq("id", data.user.id).maybeSingle();
      if (p && !p.university && p.skills.length === 0 && !p.bio) return NextResponse.redirect(new URL("/onboarding", origin));
    }
  }
  // Back to where they started, but only on this site
  return NextResponse.redirect(safeRedirect(searchParams.get("next"), origin));
}
