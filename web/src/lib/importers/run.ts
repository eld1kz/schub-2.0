// Runs the importers and writes what they found, with the service role (it skips row level security; see
// supabase/opportunity-engine.sql). Per source: skip events already past, update the ones imported before (unless an
// admin reviewed or rejected them), skip ones already listed from anywhere (dedupe.ts), add the rest. A source that
// fails is reported and the others still run.
import type { SupabaseClient } from "@supabase/supabase-js";
import { dedupeKey } from "./dedupe";
import type { ImportedEvent, Source } from "./types";

export type SourceRun = { source: Source; needsReview: boolean; load: () => Promise<ImportedEvent[]> } | { source: Source; skipped: string };

export type Report = {
  source: Source;
  fetched: number;
  past: number;
  added: number;
  updated: number;
  // Already imported and reviewed, edited or rejected by an admin: left as they are
  kept: number;
  duplicates: number;
  failed: number;
  skipped?: string;
  error?: string;
};

const empty = (source: Source): Report => ({ source, fetched: 0, past: 0, added: 0, updated: 0, kept: 0, duplicates: 0, failed: 0 });

// Past once its first date that matters is before today: the database refuses to add those (opportunities.sql)
export function isPast(e: Pick<ImportedEvent, "deadline" | "starts_at" | "ends_at">, today: string) {
  const first = e.deadline ?? e.starts_at ?? e.ends_at;
  return first !== null && first < today;
}

// The columns an importer owns
const columns = (e: ImportedEvent) => ({
  title: e.title,
  type: e.type,
  organizer: e.organizer,
  url: e.url,
  description: e.description,
  starts_at: e.starts_at,
  deadline: e.deadline,
  ends_at: e.ends_at,
  online: e.online,
  country: e.country,
  city: e.city,
  languages: e.languages,
  eligibility: e.eligibility,
  eligibility_note: e.eligibility_note,
  inferred: e.inferred,
});

type Existing = { id: string; external_id: string; status: string; reviewed_at: string | null };

async function existingRows(db: SupabaseClient, source: Source, ids: string[]) {
  const rows = new Map<string, Existing>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await db.from("opportunities").select("id, external_id, status, reviewed_at").eq("source", source).in("external_id", ids.slice(i, i + 100));
    if (error) throw new Error(`Couldn't read earlier imports (${error.code})`);
    for (const row of (data ?? []) as Existing[]) rows.set(row.external_id, row);
  }
  return rows;
}

async function importSource(db: SupabaseClient, run: Extract<SourceRun, { load: unknown }>, today: string, now: string, seen: Set<string>) {
  const report = empty(run.source);
  const events = await run.load();
  report.fetched = events.length;
  const upcoming = events.filter((e) => !isPast(e, today));
  report.past = events.length - upcoming.length;
  const existing = await existingRows(db, run.source, upcoming.map((e) => e.external_id));

  for (const e of upcoming) {
    const row = existing.get(e.external_id);
    if (row) {
      if (row.status === "removed" || row.reviewed_at) {
        report.kept++;
        continue;
      }
      const { error } = await db.from("opportunities").update({ ...columns(e), imported_at: now }).eq("id", row.id);
      if (error) report.failed++;
      else report.updated++;
      continue;
    }
    const key = dedupeKey(e);
    if (seen.has(key)) {
      report.duplicates++;
      continue;
    }
    seen.add(key);
    const { error } = await db.from("opportunities").insert({
      ...columns(e),
      source: e.source,
      external_id: e.external_id,
      imported_at: now,
      // Anything without a single date is unclear too
      needs_review: run.needsReview || (!e.starts_at && !e.deadline && !e.ends_at),
      status: "live",
    });
    // The same link, or a very similar title on the same dates, already listed (opportunities.sql)
    if (error?.code === "23505" || error?.message.includes("similar opportunity")) report.duplicates++;
    else if (error) report.failed++;
    else report.added++;
  }
  return report;
}

export async function runImport(db: SupabaseClient, runs: SourceRun[], today: string, now = new Date().toISOString()) {
  // Everything listed, from any source or added by people, for the check across sources
  const { data: listed, error } = await db.from("opportunities").select("title, starts_at, url").neq("status", "removed");
  if (error) throw new Error(`Couldn't read opportunities (${error.code})`);
  const seen = new Set(((listed ?? []) as { title: string; starts_at: string | null; url: string }[]).map(dedupeKey));

  const reports: Report[] = [];
  for (const run of runs) {
    if ("skipped" in run) {
      reports.push({ ...empty(run.source), skipped: run.skipped });
      continue;
    }
    try {
      reports.push(await importSource(db, run, today, now, seen));
    } catch (e) {
      reports.push({ ...empty(run.source), error: e instanceof Error ? e.message : String(e) });
    }
  }
  return reports;
}
