import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const isAdminPath = (path: string) => path === "/admin" || path.startsWith("/admin/");

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Refreshes the session cookie; must run before the response is returned.
  // Visitors without a session browse read-only, with no account (supabase/public-read.sql).
  const { data } = await supabase.auth.getClaims();
  const { pathname, searchParams } = request.nextUrl;

  // The admin area: an extra layer only. Every page and action checks again (lib/admin.ts), and so does the
  // database. Anyone who isn't an admin gets the not-found page with a real 404, as for any address that doesn't
  // exist (a page's own notFound() comes after its first bytes are sent, so its status stays 200).
  if (isAdminPath(pathname)) {
    const signedIn = Boolean(data?.claims.sub) && data?.claims.is_anonymous !== true;
    if (!signedIn || (await supabase.rpc("admin_access")).data === "none") {
      const notFound = NextResponse.rewrite(new URL("/404", request.url));
      response.cookies.getAll().forEach((cookie) => notFound.cookies.set(cookie));
      response = notFound;
    }
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  // A team page opened from a story image's QR code or a shared link: counted per day, nothing about who
  // (supabase/admin.sql). Only real page loads, not the app's own prefetches and navigations.
  const ref = searchParams.get("ref");
  if ((ref === "story" || ref === "link") && /^\/teams\/[^/]+$/.test(pathname) && request.method === "GET" && !request.headers.has("rsc")) {
    event.waitUntil(Promise.resolve(supabase.rpc("count_visit", { source: ref })));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
