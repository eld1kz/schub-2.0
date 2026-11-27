// Place, languages and who can join; imported events and their review; "Fill from link" limits; and the importer run
// against the database (supabase/opportunity-engine.sql, src/lib/importers/run.ts)
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { runImport, type SourceRun } from "../../src/lib/importers/run";
import type { ImportedEvent } from "../../src/lib/importers/types";
import { A, ADMIN, expectNoChange, expectRefused, guest, opportunityId, service, signInAs, signedOut, type Client } from "./helpers";

// Opportunity 8 "Sample Hack Club Jam" is imported and live; 9 "Sample Luma Builders Night" is imported and waiting
// for review; 10 "Tokyo Sample Ideathon" is limited to Japan
const live = opportunityId(8);
const pending = opportunityId(9);
let userA: Client, admin: Client;

beforeAll(async () => {
  [userA, admin] = await Promise.all([signInAs(1), signInAs(20)]);
});

afterEach(async () => {
  await service.from("opportunities").update({ needs_review: true, reviewed_at: null, status: "live" }).eq("id", pending);
  await service.from("opportunities").delete().like("title", "DB test%");
  await service.from("opportunities").delete().in("source", ["hackclub", "luma"]).like("external_id", "test-%");
  await service.from("link_fetches").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
});

const row = (fields: Record<string, unknown> = {}) => ({
  title: `DB test ${crypto.randomUUID()}`,
  type: "hackathon",
  url: `https://example.com/${crypto.randomUUID()}`,
  starts_at: "2027-06-01",
  submitted_by: A,
  ...fields,
});

describe("place, languages and who can join", () => {
  it("a member adds an event with its country, city, languages and eligibility", async () => {
    const fields = { country: "KR", city: "Busan", languages: ["Korean", "English"], eligibility: "country", eligibility_note: "Korean residents" };
    const { data, error } = await userA.from("opportunities").insert(row(fields)).select("country, city, languages, eligibility, eligibility_note").single();
    expect(error).toBeNull();
    expect(data).toEqual(fields);
  });

  it("the database refuses values outside the fixed lists, for everyone", async () => {
    for (const bad of [
      { country: "Korea" },
      { country: "kr" },
      { languages: ["Klingon"] },
      { languages: ["Korean", "Korean"] },
      { eligibility: "everyone" },
      { eligibility: "country" },
      { inferred: ["title"] },
      { city: "x".repeat(81) },
      { source: "devpost", external_id: "1" },
      { source: "hackclub" },
      { external_id: "1" },
    ]) {
      expectRefused(await service.from("opportunities").insert(row(bad)));
    }
  });

  it("one row per source and id there", async () => {
    expectRefused(await service.from("opportunities").insert(row({ source: "hackclub", external_id: "hc-sample-1", submitted_by: null })));
  });
});

describe("imported events and review", () => {
  it("people can't add rows that look imported, reviewed or waiting for review", async () => {
    await expectNoChange(["opportunities"], async () => {
      expectRefused(await userA.from("opportunities").insert(row({ source: "luma", external_id: "test-1" })));
      expectRefused(await userA.from("opportunities").insert(row({ imported_at: new Date().toISOString() })));
      expectRefused(await userA.from("opportunities").insert(row({ needs_review: true })));
      expectRefused(await userA.from("opportunities").insert(row({ reviewed_at: new Date().toISOString() })));
      expectRefused(await userA.from("opportunities").insert(row({ inferred: ["country"] })));
    });
  });

  it("an import waiting for review is hidden from everyone but admins; a reviewed one is public", async () => {
    for (const client of [signedOut(), userA]) {
      const { data } = await client.from("opportunities").select("id").in("id", [live, pending]);
      expect(data).toEqual([{ id: live }]);
    }
    const { data } = await admin.from("opportunities").select("id").in("id", [live, pending]).order("id");
    expect(data).toEqual([{ id: live }, { id: pending }]);
  });

  it("only admins approve or reject", async () => {
    await expectNoChange(["opportunities"], async () => {
      await userA.from("opportunities").update({ needs_review: false }).eq("id", pending);
      await signedOut().from("opportunities").update({ needs_review: false }).eq("id", pending);
      await userA.from("opportunities").update({ city: "Busan" }).eq("id", live);
    });

    const reviewed_at = new Date().toISOString();
    expect((await admin.from("opportunities").update({ needs_review: false, reviewed_at }).eq("id", pending)).error).toBeNull();
    const { data } = await signedOut().from("opportunities").select("id").eq("id", pending);
    expect(data).toEqual([{ id: pending }]);

    expect((await admin.from("opportunities").update({ needs_review: false, reviewed_at, status: "removed" }).eq("id", pending)).error).toBeNull();
    expect((await signedOut().from("opportunities").select("id").eq("id", pending)).data).toEqual([]);
  });
});

describe("Fill from link", () => {
  it("20 page reads an hour per member; nobody reads the log", async () => {
    for (let i = 0; i < 20; i++) expect((await userA.from("link_fetches").insert({})).error).toBeNull();
    const refused = await userA.from("link_fetches").insert({});
    expect(refused.error?.message).toContain("20 times an hour");
    // Someone else still can
    expect((await admin.from("link_fetches").insert({})).error).toBeNull();
    expect((await userA.from("link_fetches").select("*")).data).toEqual([]);
  });

  it("only as yourself, and not as a guest or signed out", async () => {
    await expectNoChange(["link_fetches"], async () => {
      expectRefused(await userA.from("link_fetches").insert({ user_id: ADMIN }));
      expectRefused(await signedOut().from("link_fetches").insert({}));
      expectRefused(await (await guest()).client.from("link_fetches").insert({}));
    });
  });
});

describe("the importer", () => {
  const event = (fields: Partial<ImportedEvent>): ImportedEvent => ({
    source: "hackclub",
    external_id: "test-1",
    title: "Importer Test Hack",
    type: "hackathon",
    organizer: "Test",
    url: "https://example.com/importer-test",
    description: "",
    starts_at: "2027-05-01",
    deadline: null,
    ends_at: "2027-05-02",
    online: false,
    country: "US",
    city: "Austin",
    languages: ["English"],
    eligibility: "students",
    eligibility_note: "",
    inferred: ["languages"],
    ...fields,
  });
  const today = "2026-11-24";
  const read = async (externalId: string) =>
    (await service.from("opportunities").select("title, city, needs_review, status").eq("external_id", externalId).maybeSingle()).data;

  it("adds new events, skips past ones and ones already listed, and keeps going when a source fails", async () => {
    // The seed's dates are relative to today, so read when the seeded event starts
    const seeded = (await service.from("opportunities").select("starts_at").eq("id", "00000000-0000-4000-9000-000000000001").single()).data?.starts_at as string;
    const runs: SourceRun[] = [
      {
        source: "hackclub",
        needsReview: false,
        load: async () => [
          event({}),
          event({ external_id: "test-past", title: "Importer Past Hack", starts_at: "2026-01-01", ends_at: "2026-01-02" }),
          // The seeded "Placeholder Hack Seoul 2027": same title, start date and site
          event({ external_id: "test-dup", title: "Placeholder Hack Seoul 2027!", starts_at: seeded, url: "https://www.example.com/other" }),
        ],
      },
      { source: "kaggle", needsReview: false, load: async () => Promise.reject(new Error("Kaggle is down")) },
      { source: "kstartup", skipped: "no DATA_GO_KR_SERVICE_KEY" },
      { source: "luma", needsReview: true, load: async () => [event({ source: "luma", external_id: "test-luma", title: "Importer Luma Night", url: "https://example.com/luma-test" })] },
    ];
    const reports = await runImport(service, runs, today);

    expect(reports.map(({ source, fetched, past, added, duplicates, failed, error, skipped }) => ({ source, fetched, past, added, duplicates, failed, error, skipped }))).toEqual([
      { source: "hackclub", fetched: 3, past: 1, added: 1, duplicates: 1, failed: 0, error: undefined, skipped: undefined },
      { source: "kaggle", fetched: 0, past: 0, added: 0, duplicates: 0, failed: 0, error: "Kaggle is down", skipped: undefined },
      { source: "kstartup", fetched: 0, past: 0, added: 0, duplicates: 0, failed: 0, error: undefined, skipped: "no DATA_GO_KR_SERVICE_KEY" },
      { source: "luma", fetched: 1, past: 0, added: 1, duplicates: 0, failed: 0, error: undefined, skipped: undefined },
    ]);
    expect(await read("test-1")).toEqual({ title: "Importer Test Hack", city: "Austin", needs_review: false, status: "live" });
    expect(await read("test-luma")).toEqual({ title: "Importer Luma Night", city: "Austin", needs_review: true, status: "live" });
    expect(await read("test-past")).toBeNull();
    expect(await read("test-dup")).toBeNull();
  });

  it("updates its own earlier imports, but leaves ones an admin reviewed or rejected", async () => {
    const run = (events: ImportedEvent[]): SourceRun[] => [{ source: "hackclub", needsReview: false, load: async () => events }];
    // Titles far apart, or the database takes them for the same event (check_new_opportunity in opportunities.sql)
    const events = (city: string) => [
      event({ city }),
      event({ external_id: "test-2", title: "Quantum Garden Sprint", url: "https://example.com/quantum", city }),
      event({ external_id: "test-3", title: "Robotics Winter Camp", url: "https://example.com/robotics", city }),
    ];
    expect((await runImport(service, run(events("Austin")), today))[0].added).toBe(3);
    await service.from("opportunities").update({ reviewed_at: new Date().toISOString(), city: "Edited" }).eq("external_id", "test-2");
    await service.from("opportunities").update({ status: "removed" }).eq("external_id", "test-3");

    const [report] = await runImport(service, run(events("Denver")), today);

    expect({ updated: report.updated, kept: report.kept, added: report.added }).toEqual({ updated: 1, kept: 2, added: 0 });
    expect((await read("test-1"))?.city).toBe("Denver");
    expect((await read("test-2"))?.city).toBe("Edited");
    expect((await read("test-3"))?.status).toBe("removed");
  });
});
