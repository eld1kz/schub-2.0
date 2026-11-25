import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { publicClient } from "@/lib/supabase/server";
import { photoUrl } from "@/lib/portfolio";
import { currentEntry, entryColumns, openRoles, teamSlots, type Entry } from "@/lib/teams";
import { hasEnded, today } from "@/lib/opportunities";
import { clampLines, textWidth, eventLine, firstName, fitSize, headline, qrPath, storyLang, storyText, type Lang, type StoryTheme } from "@/lib/story";

// The shareable team images: a 1080x1920 story and a 1200x630 link preview. Satori draws them from
// JSX with inline style objects (it has no stylesheet), so this file is the one place styles are inline.
// Only public data goes in: the team's title and roles, its event, and members' first names and photos.

const SANS = "Instrument Sans, Noto Sans KR";
const MONO = "Plex Mono, Noto Sans KR";

// About an hour: "days left" changes daily. The share links carry a version (storyVersion), so a changed
// title or roles gets a new address and never waits for this to run out.
const cacheHeaders = { "Cache-Control": "public, max-age=3600, s-maxage=3600" };

// Direction A tokens from globals.css; the accents are the oklch values in hex
const palettes = {
  light: { bg: "#ffffff", fg: "#141416", ink2: "#3b3c41", muted: "#5c5d64", line: "#cfcec9", chip: "#f2f2ef", accent: "#464ace" },
  dark: { bg: "#141416", fg: "#f2f2f0", ink2: "#cdcdd1", muted: "#a0a0a8", line: "#3d3d43", chip: "#232327", accent: "#96a6ff" },
};
type Palette = (typeof palettes)["light"];

// Hangul and Cyrillic come from Noto Sans KR. It's big, so it's only loaded when the text needs it.
const fontFile = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));
let latin: Promise<Buffer[]> | undefined;
let fallback: Promise<Buffer[]> | undefined;
async function fonts(text: string) {
  latin ??= Promise.all(["InstrumentSans-Regular.ttf", "InstrumentSans-SemiBold.ttf", "IBMPlexMono-Medium.ttf"].map(fontFile));
  const [regular, semibold, mono] = await latin;
  const list = [
    { name: "Instrument Sans", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Instrument Sans", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "Plex Mono", data: mono, weight: 500 as const, style: "normal" as const },
  ];
  if (/[^\u0000-ɏ -⁯€™←-↓−]/.test(text)) {
    fallback ??= Promise.all(["NotoSansKR-Regular.ttf", "NotoSansKR-SemiBold.ttf"].map(fontFile));
    const [kr, krBold] = await fallback;
    list.push({ name: "Noto Sans KR", data: kr, weight: 400, style: "normal" }, { name: "Noto Sans KR", data: krBold, weight: 600, style: "normal" });
  }
  return list;
}

type Person = { name: string; avatar_url: string };
type Member = { name: string; photo: string | null };
export type StoryData = {
  id: string;
  // Korean when the team's title and roles are mostly Hangul
  lang: Lang;
  title: string;
  open: string[];
  event: ReturnType<typeof eventLine>;
  eventTitle: string | null;
  members: Member[];
  // The owner, then each role: who's in it, if anyone. `closed`: the event is over.
  slots: { role: string; filled: boolean; member: Member | null }[];
  closed: boolean;
};

// The member's photo (uploaded, else from Google or GitHub) as a data URL, since the renderer won't fetch addresses
// itself; null for initials
async function photo(url: string) {
  const src = photoUrl(url);
  if (!src) return null;
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(3000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(png|jpeg|webp|gif)$/.test(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return bytes.length > 5_000_000 ? null : `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

// The team as a signed-out visitor sees it: accepted members only, never pending applicants, and nothing for a
// team an admin hid
export async function loadStory(id: string): Promise<StoryData | null> {
  const { data } = await publicClient()
    .from("teams")
    .select(`id, title, roles, owner:profiles(name, avatar_url), team_entries(${entryColumns}), team_applications(role, status, person:profiles(name, avatar_url))`)
    .eq("id", id)
    .is("hidden_at", null)
    .maybeSingle();
  if (!data) return null;
  const team = data as unknown as {
    id: string;
    title: string;
    roles: string[];
    owner: Person | null;
    team_entries: Entry[];
    team_applications: { role: string; status: string; person: Person | null }[];
  };
  // The team's current event (lib/teams.ts)
  const event = currentEntry(team.team_entries, today())?.opportunity ?? null;
  const accepted = team.team_applications.filter((a) => a.status === "accepted");
  const people = [team.owner, ...accepted.map((a) => a.person)].filter((p): p is Person => p !== null);
  const lang = storyLang([team.title, ...team.roles]);
  const faces = new Map(await Promise.all(people.map(async (p) => [p, { name: firstName(p.name), photo: await photo(p.avatar_url) }] as const)));
  const slots = teamSlots({ roles: team.roles, owner: team.owner, team_applications: accepted }, storyText[lang].lead);
  return {
    id: team.id,
    lang,
    title: team.title,
    open: openRoles({ roles: team.roles, team_applications: accepted }),
    event: eventLine(event, today(), lang),
    eventTitle: event?.title ?? null,
    members: [...faces.values()],
    slots: slots.map((s) => ({ role: s.role, filled: s.filled, member: s.person ? (faces.get(s.person) ?? null) : null })),
    closed: event !== null && hasEnded(event, today()),
  };
}

function Wordmark({ c, size }: { c: Palette; size: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.32, fontSize: size, fontWeight: 600, letterSpacing: -size * 0.03 }}>
      <div style={{ width: size * 0.56, height: size * 0.56, borderRadius: size * 0.1, background: c.accent }} />
      schub
    </div>
  );
}

// "IMAGINE CUP · 12 DAYS LEFT": the name gives way so the time left always fits on the line
function EventLine({ s, c, size, width }: { s: StoryData; c: Palette; size: number; width: number }) {
  // No-break spaces: the renderer drops ordinary spaces at the edge of a span
  const left = s.event.left ? `\u00a0·\u00a0${s.event.left}` : "";
  // Mono with 0.04em tracking; Hangul comes from the wider fallback font
  const name = clampLines(s.event.name, size * 1.07, width - textWidth(left, true) * size * 1.07, 1, true);
  return (
    <div style={{ display: "flex", fontFamily: MONO, fontSize: size, fontWeight: 500, letterSpacing: size * 0.04, color: c.ink2 }}>
      <span>{name}</span>
      {s.event.left && <span style={{ color: s.event.soon ? c.accent : c.ink2 }}>{left}</span>}
    </div>
  );
}

function Face({ m, c, size }: { m: Member; c: Palette; size: number }) {
  return m.photo ? (
    // eslint-disable-next-line @next/next/no-img-element -- Satori draws plain img elements
    <img src={m.photo} alt="" width={size} height={size} style={{ borderRadius: size, objectFit: "cover" }} />
  ) : (
    <div style={{ display: "flex", width: size, height: size, borderRadius: size, background: c.chip, color: c.ink2, alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 600 }}>
      {[...m.name][0]?.toLocaleUpperCase() ?? "?"}
    </div>
  );
}

// A QR code on a white tile in both themes, since not every camera reads light-on-dark codes
function Qr({ url, size }: { url: string; size: number }) {
  const qr = qrPath(url);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${qr.size} ${qr.size}" shape-rendering="crispEdges"><rect width="${qr.size}" height="${qr.size}" fill="#ffffff"/><path d="${qr.d}" fill="#141416"/></svg>`;
  // eslint-disable-next-line @next/next/no-img-element -- Satori draws plain img elements
  return <img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`} alt="" width={size} height={size} style={{ borderRadius: 16 }} />;
}

const allText = (s: StoryData) => [storyText[s.lang].lead, storyText[s.lang].morePeople(0), ...s.slots.map((x) => x.role), s.title, s.event.name, s.event.left ?? "", storyText[s.lang].scan, ...s.open, ...s.members.map((m) => m.name)].join(" ");

// A team's slots, as TeamSlots draws them: five to a row, at most two rows
const SEAT = { width: 164, box: 128, face: 112, text: 24, perRow: 5, rows: 2 };

function Seats({ s, c }: { s: StoryData; c: Palette }) {
  const room = SEAT.perRow * SEAT.rows;
  const shown = s.slots.length > room ? s.slots.slice(0, room - 1) : s.slots;
  const extra = s.slots.length - shown.length;
  const label = (text: string, color: string) => (
    <div style={{ display: "flex", justifyContent: "center", textAlign: "center", fontSize: SEAT.text, lineHeight: 1.2, color }}>{clampLines(text, SEAT.text, SEAT.width - 16, 2)}</div>
  );
  const tile = { display: "flex", width: SEAT.width, height: SEAT.box, borderRadius: 12, alignItems: "center", justifyContent: "center" } as const;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", columnGap: 21, rowGap: 20 }}>
      {shown.map((slot, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: SEAT.width }}>
          {slot.filled ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={tile}><Face m={slot.member ?? { name: "", photo: null }} c={c} size={SEAT.face} /></div>
              {label(slot.role, c.ink2)}
            </div>
          ) : (
            <div style={{ ...tile, border: `3px dashed ${c.line}`, padding: "0 8px" }}>{label(slot.role, s.closed ? c.muted : c.ink2)}</div>
          )}
        </div>
      ))}
      {extra > 0 && <div style={{ ...tile, border: `2px solid ${c.line}`, fontSize: 34, color: c.ink2 }}>+{extra}</div>}
    </div>
  );
}

// Instagram puts its own buttons in the top and bottom 250px, so everything sits between them
const STORY = { width: 1080, height: 1920, safe: 250, side: 88 };

export async function storyImage(s: StoryData, theme: StoryTheme, joinUrl: string) {
  const c = palettes[theme];
  const width = STORY.width - STORY.side * 2;
  const { line } = headline(s.open, s.eventTitle, s.lang);
  // Two rows of seats leave the headline two lines
  const lines = s.slots.length > SEAT.perRow ? 2 : 3;
  const size = fitSize(line, width, lines, 132, 72);

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: c.bg, color: c.fg, fontFamily: SANS, wordBreak: "keep-all", padding: `${STORY.safe + 40}px ${STORY.side}px` }}>
        <Wordmark c={c} size={44} />
        {/* The team sits in the middle of the screen, the wordmark above and the members and QR code below */}
        <div style={{ display: "flex", flexGrow: 1, minHeight: 72 }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <EventLine s={s} c={c} size={32} width={width} />
          <div style={{ display: "flex", marginTop: 28, fontSize: size, fontWeight: 600, lineHeight: 1.04, letterSpacing: -size * 0.03 }}>{line}</div>
          <div style={{ display: "flex", marginTop: 48 }}>
            <Seats s={s} c={c} />
          </div>
          <div style={{ display: "flex", marginTop: 40, fontSize: 42, lineHeight: 1.32, color: c.ink2 }}>{clampLines(s.title, 42, width, 2)}</div>
        </div>
        <div style={{ display: "flex", flexGrow: 1, minHeight: 72 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${c.line}`, paddingTop: 40 }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 600 }}>{storyText[s.lang].scan}</div>
          <Qr url={joinUrl} size={216} />
        </div>
      </div>
    ),
    { width: STORY.width, height: STORY.height, fonts: await fonts(allText(s)), headers: cacheHeaders },
  );
}

// The link preview: the same look, sideways, without the QR code
export async function previewImage(s: StoryData, theme: StoryTheme) {
  const c = palettes[theme];
  const width = 1200 - 64 * 2;
  const { line, list } = headline(s.open, s.eventTitle, s.lang);
  const size = fitSize(line, width, 2, 84, 48);
  const faces = s.members.slice(0, 5);
  const first = s.members.slice(0, 3).map((m) => m.name).join(", ");
  const names = s.members.length > 3 ? storyText[s.lang].andMore(first, s.members.length - 3) : first;

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: c.bg, color: c.fg, fontFamily: SANS, wordBreak: "keep-all", padding: 64 }}>
        <Wordmark c={c} size={34} />
        <div style={{ display: "flex", flexGrow: 1 }} />
        <EventLine s={s} c={c} size={24} width={width} />
        <div style={{ display: "flex", marginTop: 16, fontSize: size, fontWeight: 600, lineHeight: 1.05, letterSpacing: -size * 0.03 }}>{line}</div>
        {list.length > 0 && <div style={{ display: "flex", marginTop: 14, fontSize: 30, color: c.fg }}>{clampLines(list.join(" · "), 30, width, 1)}</div>}
        <div style={{ display: "flex", marginTop: 14, fontSize: 30, lineHeight: 1.3, color: c.ink2 }}>{clampLines(s.title, 30, width, list.length > 0 ? 1 : 2)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 28, paddingTop: 24, borderTop: `2px solid ${c.line}` }}>
          <div style={{ display: "flex", gap: 8 }}>
            {faces.map((m, i) => <Face key={i} m={m} c={c} size={52} />)}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: c.ink2 }}>{clampLines(names, 26, 700, 1)}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: await fonts(allText(s)), headers: cacheHeaders },
  );
}
