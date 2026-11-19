import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { sendSignInLink, signIn } from "./actions";
import { LAST_METHOD_COOKIE, enabledMethods, lastUsedFirst, type OAuthProvider } from "@/lib/auth-providers";
import { EmailSignIn } from "./email-sign-in";

const icon = "h-[18px] w-[18px] shrink-0";

const providers: Record<OAuthProvider, { name: string; icon: ReactNode }> = {
  google: {
    name: "Google",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden className={icon}>
        <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
      </svg>
    ),
  },
  github: {
    name: "GitHub",
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden className={`${icon} fill-current`}>
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
      </svg>
    ),
  },
  kakao: {
    name: "Kakao",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden className={`${icon} fill-current`}>
        <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.88 5.32 4.7 6.73l-.96 3.53c-.08.31.27.56.54.38l4.2-2.78c.5.06 1 .1 1.52.1 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
      </svg>
    ),
  },
};

// Every sign-in option, on /login and on the landing page. Only methods listed in AUTH_PROVIDERS show.
// `next` is where people land after signing in; `error` says the last attempt failed.
// The method this browser signed in with last (a cookie set by /auth/callback) goes first, marked "Last used".
export async function SignInOptions({ next = "/", error = false }: { next?: string; error?: boolean }) {
  const { lastUsed, ordered } = lastUsedFirst(enabledMethods(), (await cookies()).get(LAST_METHOD_COOKIE)?.value);
  const oauth = ordered.filter((m) => m !== "email");
  const email = ordered.includes("email");

  const buttons = oauth.map((p) => (
    <form key={p} action={signIn.bind(null, p, next)}>
      {/* The label takes its room at the right and the rest centers beside it, so they never overlap on narrow phones */}
      <button className="btn-outline h-11 w-full gap-2 text-[15px]">
        <span className="flex flex-1 items-center justify-center gap-2.5">
          {providers[p].icon}
          Continue with {providers[p].name}
        </span>
        {lastUsed === p && <span className="font-mono text-[11px] font-normal text-muted">Last used</span>}
      </button>
    </form>
  ));
  const divider = oauth.length > 0 && email && (
    <div className="flex items-center gap-3 text-[13px] text-muted">
      <span aria-hidden className="h-px flex-1 bg-border" />
      or
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
  const form = email && <EmailSignIn action={sendSignInLink.bind(null, next)} lastUsed={lastUsed === "email"} />;

  return (
    <div className="flex w-full max-w-[360px] flex-col gap-3">
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Sign-in didn&apos;t work. Try again or use another option.
        </p>
      )}
      {lastUsed === "email" ? <>{form}{divider}{buttons}</> : <>{buttons}{divider}{form}</>}
    </div>
  );
}
