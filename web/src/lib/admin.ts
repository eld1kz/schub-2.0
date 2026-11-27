import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";

// Who the visitor is to the admin area (admin_access() in supabase/admin.sql):
// "admin" signed in and verified with their second factor; "code" an admin who still has to enter their 6-digit
// code; "setup" an admin with no authenticator yet; "none" everyone else, signed out included.
export type AdminAccess = "admin" | "code" | "setup" | "none";

// Once per request, however many layouts, pages and actions ask
export const adminAccess = cache(async () => {
  const user = await requireUser();
  if (user.isGuest) return { ...user, access: "none" as AdminAccess };
  const { data } = await user.supabase.rpc("admin_access");
  const access: AdminAccess = data === "admin" || data === "code" || data === "setup" ? data : "none";
  return { ...user, access };
});

// Every /admin page and every admin server action starts here. The user comes from the verified session, never
// from anything the browser sends. Anyone who isn't an admin gets the same not-found page as a missing URL; an
// admin who hasn't entered their code is sent to the code screen. The database checks again (is_admin()).
export async function requireAdmin(back = "/admin") {
  const { access, supabase, userId } = await adminAccess();
  if (access === "none") notFound();
  if (access !== "admin") redirect(`/admin/verify?next=${encodeURIComponent(back)}`);
  return { supabase, userId };
}
