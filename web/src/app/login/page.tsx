import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { localPath } from "@/lib/redirect";
import { PublicHeader } from "../public-header";
import { SignInOptions } from "../sign-in-options";

// Every sign-in option. `next` is the page to go back to; `error` is set when the last attempt failed.
export const instant = false;

export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const next = localPath(typeof params.next === "string" ? params.next : null);
  const { isGuest } = await requireUser();
  if (!isGuest) redirect(next);

  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-[392px] px-4 pt-12 pb-24 sm:pt-20">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] sm:text-[32px]">Sign in to Schub</h1>
        <p className="mt-2 text-[15px] leading-normal text-ink2">New here? Signing in creates your account.</p>
        <div className="mt-8">
          <SignInOptions next={next} error={params.error !== undefined} />
        </div>
      </main>
    </>
  );
}
