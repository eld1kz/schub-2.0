import { notFound, redirect } from "next/navigation";
import { adminAccess } from "@/lib/admin";
import { localPath } from "@/lib/redirect";
import { VerifyForm } from "./verify-form";
import { ButtonLink, PageHeader } from "@/components/ui";

export const instant = false;

// An admin signed in without their second factor: "Enter your 6-digit code", or, with no authenticator yet,
// where to set one up. Anyone who isn't an admin gets the not-found page, like every /admin address.
export default async function AdminVerifyPage(props: PageProps<"/admin/verify">) {
  const { next } = await props.searchParams;
  const back = localPath(typeof next === "string" ? next : "/admin");
  const { access } = await adminAccess();
  if (access === "none") notFound();
  if (access === "admin") redirect(back.startsWith("/admin") ? back : "/admin");

  return (
    <div className="mx-auto flex max-w-column flex-col gap-4 py-8">
      {access === "code" ? (
        <>
          <PageHeader title="Enter your 6-digit code" description="The admin area needs a code from your authenticator app, every time you sign in." />
          <VerifyForm next={back} />
        </>
      ) : (
        <>
          <PageHeader title="Set up two-factor first" description="The admin area needs two-factor authentication. Turn it on in Settings, then come back here." />
          <ButtonLink href="/settings" className="w-fit">Go to Settings</ButtonLink>
        </>
      )}
    </div>
  );
}
