import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { localPath, safeRedirect } from "@/lib/redirect";
import { LAST_METHOD_COOKIE, sessionMethod } from "@/lib/auth-providers";

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
  // A profile with no university, skills or bio is new: onboarding first. Otherwise back to where they started, on this site only.
  const { data: p } = await supabase.from("profiles").select("university, skills, bio").eq("id", data.user.id).maybeSingle();
  const isNew = p && !p.university && p.skills.length === 0 && !p.bio;
  const response = NextResponse.redirect(isNew ? new URL("/onboarding", origin) : safeRedirect(searchParams.get("next"), origin));

  // /login and the landing page mark this method "Last used" next time, even after signing out
  const { data: claims } = await supabase.auth.getClaims();
  const method = sessionMethod(claims?.claims.amr, data.user.identities ?? []);
  if (method) {
    response.cookies.set(LAST_METHOD_COOKIE, method, { maxAge: 60 * 60 * 24 * 365, sameSite: "lax", path: "/", httpOnly: true, secure: request.nextUrl.protocol === "https:" });
  }
  return response;
}
