import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { SignInPrompt } from "../sign-in";

export const instant = false;

// Profiles are edited in place on /u/[id]
export default async function ProfilePage() {
  const { userId, isGuest } = await requireUser();
  if (isGuest) return <SignInPrompt text="Sign in to create your profile. It stays with your account on every device." />;
  redirect(`/u/${userId}`);
}
