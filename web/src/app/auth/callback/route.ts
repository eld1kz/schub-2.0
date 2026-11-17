import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google sends people back here after sign-in; the code becomes the session cookie
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  // Back to where they started, but only on this site
  const next = new URL(searchParams.get("next") ?? "/", origin);
  return NextResponse.redirect(next.origin === origin ? next : new URL("/", origin));
}
