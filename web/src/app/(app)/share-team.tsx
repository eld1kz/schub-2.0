"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { qrPath, storyPath, type StoryTheme } from "@/lib/story";

// Sharing a team as a story image (/teams/[id]/story.png). Which options show depends on what the device can do,
// never on its user agent. With a mouse or trackpad (pointer: fine) it's a laptop: a QR code hands the image over
// to your phone, the image can be copied, and Share (for AirDrop and the like) comes second. Otherwise, if it can
// share an image file, it's a phone: "Share" sends it straight to Instagram, Kakao or Telegram.

type Team = { teamId: string; title: string; version: string };

const fileName = (title: string) => `schub-${title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 40) || "team"}.png`;

// Can this browser share an image file? Checked with a stand-in file, so the answer is there before the image is
function canShareImages() {
  try {
    return navigator.canShare?.({ files: [new File([new Uint8Array(1)], "probe.png", { type: "image/png" })] }) ?? false;
  } catch {
    return false;
  }
}

function canCopyImages() {
  return typeof ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function" && (typeof ClipboardItem.supports !== "function" || ClipboardItem.supports("image/png"));
}

// The image for the chosen theme, fetched ahead so Share can run straight from the tap
function useStoryBlob({ teamId, version }: Team, theme: StoryTheme, enabled: boolean) {
  const [blobs, setBlobs] = useState<Partial<Record<StoryTheme, Blob>>>({});
  const [failed, setFailed] = useState(false);
  const has = Boolean(blobs[theme]);
  useEffect(() => {
    if (!enabled || has) return;
    let gone = false;
    fetch(storyPath(teamId, theme, version))
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
      .then((blob) => !gone && setBlobs((b) => ({ ...b, [theme]: blob })))
      .catch(() => !gone && setFailed(true));
    return () => {
      gone = true;
    };
  }, [enabled, has, teamId, theme, version]);
  return { blob: blobs[theme] ?? null, failed };
}

function ThemeToggle({ theme, onChange }: { theme: StoryTheme; onChange: (t: StoryTheme) => void }) {
  return (
    <div role="group" aria-label="Image style" className="inline-flex w-fit rounded-md border border-line2 p-0.5">
      {(["light", "dark"] as const).map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={theme === t}
          onClick={() => onChange(t)}
          className={`h-8 rounded-sm px-3 text-sm font-medium capitalize ${theme === t ? "bg-chip text-foreground" : "text-ink2 hover:text-foreground"}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function Preview({ team, theme, className }: { team: Team; theme: StoryTheme; className: string }) {
  return (
    <Image
      src={storyPath(team.teamId, theme, team.version)}
      alt={`Story image for ${team.title}`}
      width={1080}
      height={1920}
      unoptimized
      className={`rounded-md border border-border bg-chip ${className}`}
    />
  );
}

// "Share", "Copy link", "Copy image" and "Download image", whichever apply, with a short note after each
function useActions(team: Team, theme: StoryTheme, blob: Blob | null) {
  const [note, setNote] = useState("");
  const link = () => `${location.origin}/teams/${team.teamId}?ref=link`;
  const done = (text: string) => setNote(text);
  return {
    note,
    share: async () => {
      if (!blob) return;
      try {
        await navigator.share({ files: [new File([blob], fileName(team.title), { type: "image/png" })] });
      } catch (e) {
        if ((e as Error).name !== "AbortError") done("Couldn't share. Try Download image.");
      }
    },
    copyLink: async () => {
      try {
        await navigator.clipboard.writeText(link());
        done("Link copied");
      } catch {
        done(link());
      }
    },
    copyImage: async () => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        done("Image copied. Paste it into a chat.");
      } catch {
        done("Couldn't copy the image. Try Download image.");
      }
    },
    download: { href: storyPath(team.teamId, theme, team.version), download: fileName(team.title) },
  };
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

const iconButton = "grid h-9 w-9 shrink-0 place-items-center rounded-md text-ink2 hover:bg-chip hover:text-foreground";

// The Share button and its dialog. `variant`: "primary" for the team's owner, "outline" for everyone else,
// "icon" on the rows in Your teams.
export function ShareTeamButton({ variant, ...team }: Team & { variant: "primary" | "outline" | "icon" }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pressedOutside = useRef(false);
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<"phone" | "laptop">("laptop");
  const [copyImage, setCopyImage] = useState(false);
  const [shareFiles, setShareFiles] = useState(false);
  const [theme, setTheme] = useState<StoryTheme>("light");
  const { blob, failed } = useStoryBlob(team, theme, open);
  const actions = useActions(team, theme, blob);
  const [origin, setOrigin] = useState("");

  function openDialog() {
    // Decided each time it opens, from what this browser supports
    const files = canShareImages();
    setLayout(files && !matchMedia("(pointer: fine)").matches ? "phone" : "laptop");
    setShareFiles(files);
    setCopyImage(canCopyImages());
    setOrigin(location.origin);
    setOpen(true);
  }

  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  const trigger =
    variant === "icon" ? (
      <button type="button" onClick={openDialog} aria-label={`Share ${team.title}`} title="Share" className={iconButton}><ShareIcon /></button>
    ) : (
      <button type="button" onClick={openDialog} className={`${variant === "primary" ? "btn" : "btn-outline"} h-9 gap-2`}><ShareIcon />Share</button>
    );

  return (
    <>
      {trigger}
      <dialog
        ref={dialog}
        aria-label="Share this team"
        onClose={() => setOpen(false)}
        onMouseDown={(e) => {
          pressedOutside.current = e.target === dialog.current;
        }}
        onClick={(e) => {
          if (pressedOutside.current && e.target === dialog.current) dialog.current?.close();
        }}
        className="m-0 mt-auto max-h-[94dvh] w-full max-w-none overflow-y-auto rounded-t-lg bg-background p-0 text-foreground backdrop:bg-[rgba(20,20,24,0.45)] sm:mx-auto sm:mt-16 sm:mb-auto sm:max-h-[calc(100dvh-8rem)] sm:max-w-dialog sm:rounded-lg sm:border sm:border-line2 sm:shadow-modal "
      >
        {open && (
          <div data-layout={layout} className="flex flex-col">
            <div aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line2 sm:hidden" />
            <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold sm:text-xl sm:tracking-snug">Share this team</h2>
              <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className={iconButton}>
                <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-none stroke-current" strokeWidth={2} strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <div className="flex flex-col gap-4 px-4 py-4 sm:grid sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-6 sm:px-6 sm:py-6">
              <Preview team={team} theme={theme} className="mx-auto h-[min(44dvh,391px)] w-auto sm:h-auto sm:w-full" />
              <div className="flex min-w-0 flex-col gap-4">
                <p className="text-sm text-ink2">A story image with the open roles and a QR code to the team.</p>
                <ThemeToggle theme={theme} onChange={setTheme} />
                {layout === "phone" ? (
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={actions.share} disabled={!blob} className="btn h-11 gap-2 text-base disabled:opacity-50"><ShareIcon />Share</button>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={actions.copyLink} className="btn-outline h-11">Copy link</button>
                      <a {...actions.download} className="btn-outline h-11">Download image</a>
                    </div>
                  </div>
                ) : (
                  <>
                    <section aria-label="Post to your story from your phone" className="flex items-center gap-4 rounded-md border border-border p-4">
                      <QrCode text={`${origin}/teams/${team.teamId}/share?theme=${theme}`} />
                      <div className="flex flex-col gap-1">
                        <h3 className="text-base font-semibold">Post to your story from your phone</h3>
                        <p className="text-sm text-ink2">Scan with your phone&apos;s camera, then tap Share to send it to Instagram, Kakao or Telegram.</p>
                      </div>
                    </section>
                    <div className="flex flex-wrap gap-2">
                      {copyImage && <button type="button" onClick={actions.copyImage} disabled={!blob} className="btn-outline disabled:opacity-50">Copy image</button>}
                      {shareFiles && <button type="button" onClick={actions.share} disabled={!blob} className="btn-outline gap-2 disabled:opacity-50"><ShareIcon />Share</button>}
                      <button type="button" onClick={actions.copyLink} className="btn-outline">Copy link</button>
                      <a {...actions.download} className="btn-outline">Download image</a>
                    </div>
                  </>
                )}
                <p aria-live="polite" className="min-h-5 text-sm text-ink2 break-all">{failed ? "Couldn't load the image. Try again later." : actions.note}</p>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

function QrCode({ text }: { text: string }) {
  const { size, d } = qrPath(text);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR code to the share page" shapeRendering="crispEdges" className="h-[112px] w-[112px] shrink-0 rounded-sm bg-qr-paper">
      <path d={d} className="fill-qr-ink" />
    </svg>
  );
}

const noSubscription = () => () => {};

// /teams/[id]/share, opened from the QR code on a laptop: the image and one big Share button
export function ShareOnPhone({ initialTheme, ...team }: Team & { initialTheme: StoryTheme }) {
  const [theme, setTheme] = useState(initialTheme);
  // null while rendering on the server, where there's no browser to ask
  const canShare = useSyncExternalStore(noSubscription, canShareImages, () => null);
  const { blob, failed } = useStoryBlob(team, theme, true);
  const actions = useActions(team, theme, blob);

  return (
    <div className="flex flex-col items-center gap-4">
      <Preview team={team} theme={theme} className="h-[min(58dvh,560px)] w-auto" />
      <ThemeToggle theme={theme} onChange={setTheme} />
      <div className="flex w-full max-w-narrow flex-col gap-2">
        {canShare !== false && <button type="button" onClick={actions.share} disabled={!blob || !canShare} className="btn h-12 gap-2 text-base disabled:opacity-50"><ShareIcon />Share</button>}
        {canShare === false && <p className="text-center text-sm text-ink2">This browser can&apos;t share images. Download it, then post it from your gallery.</p>}
        <a {...actions.download} className={`${canShare === false ? "btn" : "btn-outline"} h-11`}>Download image</a>
      </div>
      <p aria-live="polite" className="min-h-5 text-sm text-ink2">{failed ? "Couldn't load the image. Try again later." : actions.note}</p>
    </div>
  );
}
