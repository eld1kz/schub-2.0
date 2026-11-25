// Imports opportunities from every source (src/lib/importers) into the database: npm run import:opportunities.
// Run twice a day by .github/workflows/import-opportunities.yml. Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY;
// KAGGLE_API_TOKEN and DATA_GO_KR_SERVICE_KEY turn on those sources. The repository is public, so the output is
// counts per source and short error messages only: never keys, links with keys in them, or event data.
// Exits 1 when a source failed, after every source has run.
import { createClient } from "@supabase/supabase-js";
import { fetchHackClub } from "../src/lib/importers/hackclub";
import { fetchKaggle } from "../src/lib/importers/kaggle";
import { fetchKStartup } from "../src/lib/importers/kstartup";
import { fetchLuma } from "../src/lib/importers/luma";
import { runImport, type SourceRun } from "../src/lib/importers/run";
import calendars from "../src/lib/importers/luma-calendars.json";

const env = (name: string) => process.env[name]?.trim() ?? "";
const secrets = ["SUPABASE_SERVICE_ROLE_KEY", "KAGGLE_API_TOKEN", "DATA_GO_KR_SERVICE_KEY"].map(env).filter(Boolean);

// Any key that slipped into a message, raw or URL-encoded, and any query string (data.go.kr keys travel in one)
function redact(text: string) {
  let clean = text.replace(/\?[^\s"']*/g, "?…");
  for (const secret of secrets) clean = clean.split(secret).join("***").split(encodeURIComponent(secret)).join("***");
  return clean.slice(0, 200);
}

async function main() {
  const url = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const kaggle = env("KAGGLE_API_TOKEN");
  const kstartup = env("DATA_GO_KR_SERVICE_KEY");
  const runs: SourceRun[] = [
    { source: "hackclub", needsReview: false, load: () => fetchHackClub() },
    kaggle ? { source: "kaggle", needsReview: false, load: () => fetchKaggle(kaggle) } : { source: "kaggle", skipped: "no KAGGLE_API_TOKEN" },
    kstartup ? { source: "kstartup", needsReview: false, load: () => fetchKStartup(kstartup) } : { source: "kstartup", skipped: "no DATA_GO_KR_SERVICE_KEY" },
    calendars.feeds.length > 0
      ? { source: "luma", needsReview: true, load: () => fetchLuma(calendars.feeds) }
      : { source: "luma", skipped: "no feeds in luma-calendars.json" },
  ];

  const reports = await runImport(db, runs, new Date().toISOString().slice(0, 10));
  console.log("source    fetched  past  added  updated  kept  duplicates  failed");
  for (const r of reports) {
    const counts = [r.fetched, r.past, r.added, r.updated, r.kept, r.duplicates, r.failed];
    const note = r.skipped ? `skipped: ${r.skipped}` : r.error ? `error: ${redact(r.error)}` : "";
    console.log(`${r.source.padEnd(9)} ${counts.map((n, i) => String(n).padStart([7, 5, 6, 8, 5, 11, 7][i])).join(" ")}  ${note}`.trimEnd());
  }
  if (reports.some((r) => r.error || r.failed > 0)) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`Import stopped: ${redact(e instanceof Error ? e.message : String(e))}`);
  process.exitCode = 1;
});
