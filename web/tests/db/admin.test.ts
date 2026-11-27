// The admin area's database side (supabase/admin.sql): who can call the admin functions, the audit log, reports,
// suspensions, hidden people and teams, and visit counts.
// Seed: student 13 is reported for spam (by 02), team 5 (owner 11) as fake (by 04), event 6 is hidden after 3 reports.
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  A, ADMIN, adminWithoutCode, expectNoChange, expectRefused, id, opportunityId, rows, service, signInAs, signInAsAdmin, signedOut, teamId,
  type Client,
} from "./helpers";
import { allTables, triesToWriteEverything } from "./write-everything";

let userA: Client, admin: Client, adminNoCode: Client;

beforeAll(async () => {
  [userA, admin, adminNoCode] = await Promise.all([signInAs(1), signInAsAdmin(), adminWithoutCode()]);
});

const reportId = async (kind: string, target: string) =>
  (await service.from("reports").select("id").eq("target_type", kind).eq("target_id", target).order("created_at").limit(1).single()).data?.id as string;

const logCount = async () => (await rows("admin_actions", "id")).length;
const lastLog = async () => (await service.from("admin_actions").select("*").order("id", { ascending: false }).limit(1).single()).data;

// Everything an admin function can change, to check a refused call changes none of it
const touched = ["admin_actions", "reports", "suspensions", "profiles", "teams", "opportunities"];

// Every admin function, with arguments that work for an admin
async function everyAdminCall(): Promise<[string, Record<string, unknown>][]> {
  const event = (await service.from("opportunities").select("*").eq("id", opportunityId(3)).single()).data;
  return [
    ["admin_hide", { kind: "person", target: id(13), reason: "Spam" }],
    ["admin_restore", { kind: "event", target: opportunityId(6), reason: "" }],
    ["admin_suspend", { person: id(13), reason: "Spam" }],
    ["admin_unsuspend", { person: id(13), reason: "" }],
    ["admin_dismiss", { report: await reportId("team", teamId(5)), reason: "Fine" }],
    ["admin_set_featured", { event: opportunityId(1), featured: true }],
    ["admin_edit_event", { event: event.id, fields: { title: "Edited by someone", city: "Busan", languages: ["Korean"] }, reason: "" }],
    // Opportunity 9 is an import waiting for review (opportunity-engine.sql)
    ["admin_review_import", { event: opportunityId(9), decision: "approve", reason: "" }],
    ["admin_overview", {}],
    ["admin_person_summary", { person: A }],
  ];
}

describe("who is an admin", () => {
  it("admin_access tells the app what each visitor is", async () => {
    expect((await admin.rpc("admin_access")).data).toBe("admin");
    expect((await adminNoCode.rpc("admin_access")).data).toBe("code");
    expect((await userA.rpc("admin_access")).data).toBe("none");
    expect((await signedOut().rpc("admin_access")).error).not.toBeNull();
  });

  it("an admin with no authenticator yet has to set one up", async () => {
    await service.from("admins").insert({ user_id: id(19) });
    try {
      expect((await (await signInAs(19)).rpc("admin_access")).data).toBe("setup");
      expect((await (await signInAs(19)).rpc("is_admin")).data).toBe(false);
    } finally {
      await service.from("admins").delete().eq("user_id", id(19));
    }
  });

  for (const [who, client] of [["signed out", () => signedOut()], ["a member", () => userA], ["the admin without the code", () => adminNoCode]] as const) {
    it(`every admin function refuses ${who}, and nothing changes`, async () => {
      const calls = await everyAdminCall();
      await expectNoChange(touched, async () => {
        for (const [fn, args] of calls) {
          const { data, error } = await client().rpc(fn, args);
          expect(error, `${fn} for ${who}`).not.toBeNull();
          expect(data).toBeNull();
        }
      });
    });
  }

  it("the helpers behind the admin functions can't be called at all, not even by the admin", async () => {
    await expectNoChange(touched, async () => {
      for (const [fn, args] of [
        ["set_hidden", { kind: "person", target: id(13), hide: true }],
        ["close_reports", { kind: "person", target: id(13), outcome: "dismissed" }],
        ["log_admin_action", { act: "hide", kind: "person", target: id(13), reason: "x", details: {} }],
        ["admin_guard", { reason: "x", required: false }],
      ] as const) {
        expectRefused(await admin.rpc(fn, args));
      }
    });
  });
});

describe("admin actions, with the code entered", () => {
  afterEach(async () => {
    // The log stays (nobody can change it); everything else goes back to the seed
    await service.from("profiles").update({ hidden_at: null }).in("id", [id(13)]);
    await service.from("teams").update({ hidden_at: null }).eq("id", teamId(5));
    await service.from("suspensions").delete().neq("user_id", ADMIN);
    await service.from("reports").update({ status: "open", resolved_at: null }).neq("status", "open");
    await service.from("opportunities").update({ status: "hidden" }).eq("id", opportunityId(6));
    await service.from("opportunities").update({ status: "live", featured: false }).eq("id", opportunityId(1));
  });

  // Runs one admin function and checks it wrote exactly one log row, which it returns
  async function logged(fn: string, args: Record<string, unknown>) {
    const before = await logCount();
    const { error } = await admin.rpc(fn, args);
    expect(error, fn).toBeNull();
    expect(await logCount(), `${fn} log rows`).toBe(before + 1);
    const row = await lastLog();
    expect(row.admin_id).toBe(ADMIN);
    return row;
  }

  it("hides and restores a person, a team and an event; hiding closes their open reports", async () => {
    const hid = await logged("admin_hide", { kind: "person", target: id(13), reason: "Spam" });
    expect(hid).toMatchObject({ action: "hide", target_type: "person", target_id: id(13), reason: "Spam", details: { before: "visible", after: "hidden" } });
    expect((await service.from("profiles").select("hidden_at").eq("id", id(13)).single()).data?.hidden_at).not.toBeNull();
    expect((await service.from("reports").select("status").eq("target_id", id(13)).single()).data).toEqual({ status: "actioned" });
    await logged("admin_restore", { kind: "person", target: id(13), reason: "" });
    expect((await service.from("profiles").select("hidden_at").eq("id", id(13)).single()).data).toEqual({ hidden_at: null });

    await logged("admin_hide", { kind: "team", target: teamId(5), reason: "Fake" });
    expect((await service.from("teams").select("hidden_at").eq("id", teamId(5)).single()).data?.hidden_at).not.toBeNull();
    await logged("admin_restore", { kind: "team", target: teamId(5), reason: "" });

    const restored = await logged("admin_restore", { kind: "event", target: opportunityId(6), reason: "Checked, it's real" });
    expect(restored.details).toEqual({ before: "hidden", after: "live" });
    await logged("admin_hide", { kind: "event", target: opportunityId(6), reason: "Spam" });
    expect((await service.from("opportunities").select("status").eq("id", opportunityId(6)).single()).data).toEqual({ status: "hidden" });
  });

  it("suspends and unsuspends; suspending closes the open reports about the person and the report it answers", async () => {
    const report = await reportId("team", teamId(5));
    const row = await logged("admin_suspend", { person: id(11), reason: "Fake team", report });
    expect(row).toMatchObject({ action: "suspend", target_type: "person", target_id: id(11), reason: "Fake team", details: { reports: [report] } });
    expect(await rows("suspensions", "user_id, reason")).toEqual([{ user_id: id(11), reason: "Fake team" }]);
    expect((await service.from("reports").select("status").eq("id", report).single()).data).toEqual({ status: "actioned" });
    expect((await admin.rpc("admin_suspend", { person: id(11), reason: "Again" })).error?.message).toBe("Already suspended.");

    const lifted = await logged("admin_unsuspend", { person: id(11), reason: "" });
    expect(lifted.details).toEqual({ suspended_for: "Fake team" });
    expect(await rows("suspensions")).toEqual([]);
  });

  it("admins can't be suspended", async () => {
    await expectNoChange(["suspensions", "admin_actions"], async () => {
      expect((await admin.rpc("admin_suspend", { person: ADMIN, reason: "x" })).error?.message).toBe("Admins can't be suspended.");
    });
  });

  it("dismissing closes every open report about the same thing", async () => {
    await service.from("reports").insert({ target_type: "person", target_id: id(13), reporter_id: id(3), reason: "other" });
    try {
      const row = await logged("admin_dismiss", { report: await reportId("person", id(13)), reason: "Not spam" });
      expect(row).toMatchObject({ action: "dismiss", target_type: "person", target_id: id(13), reason: "Not spam" });
      expect((row.details as { reports: string[] }).reports).toHaveLength(2);
      const { data } = await service.from("reports").select("status").eq("target_id", id(13));
      expect(data).toEqual([{ status: "dismissed" }, { status: "dismissed" }]);
    } finally {
      await service.from("reports").delete().eq("reporter_id", id(3)).eq("target_id", id(13));
    }
  });

  it("hiding, suspending and dismissing need a reason; nothing happens without one", async () => {
    await expectNoChange(touched, async () => {
      for (const [fn, args] of [
        ["admin_hide", { kind: "person", target: id(13), reason: "  " }],
        ["admin_suspend", { person: id(13), reason: "" }],
        ["admin_dismiss", { report: await reportId("person", id(13)), reason: "" }],
      ] as const) {
        expect((await admin.rpc(fn, args)).error?.message, fn).toBe("Give a reason.");
      }
    });
  });

  it("features an event, and the log keeps before and after", async () => {
    const on = await logged("admin_set_featured", { event: opportunityId(1), featured: true });
    expect(on).toMatchObject({ action: "feature", target_type: "event", details: { before: false, after: true } });
    expect((await signedOut().from("opportunities").select("featured").eq("id", opportunityId(1)).single()).data).toEqual({ featured: true });
    const off = await logged("admin_set_featured", { event: opportunityId(1), featured: false });
    expect(off).toMatchObject({ action: "unfeature", details: { before: true, after: false } });
  });

  it("edits an event, the opportunity engine's columns too; the log keeps only the fields that changed", async () => {
    const [[, args]] = (await everyAdminCall()).filter(([fn]) => fn === "admin_edit_event");
    const { data: before } = await service.from("opportunities").select("title, city, languages").eq("id", opportunityId(3)).single();
    try {
      const row = await logged("admin_edit_event", { ...args, reason: "Typo" });
      expect(row).toMatchObject({
        action: "edit", target_type: "event", reason: "Typo",
        details: { before: { title: before?.title, city: before?.city, languages: before?.languages }, after: { title: "Edited by someone", city: "Busan", languages: ["Korean"] } },
      });
      // Only the editable columns
      expect((await admin.rpc("admin_edit_event", { event: opportunityId(3), fields: { featured: true } })).error?.message).toBe("Unknown field.");
    } finally {
      await service.from("opportunities").update(before ?? {}).eq("id", opportunityId(3));
    }
  });

  it("editing an import publishes it, so the importer stops overwriting it", async () => {
    try {
      const row = await logged("admin_edit_event", { event: opportunityId(9), fields: { city: "Busan" } });
      expect(row.details).toMatchObject({ before: { needs_review: true }, after: { city: "Busan", needs_review: false } });
      const { data } = await service.from("opportunities").select("needs_review, reviewed_at").eq("id", opportunityId(9)).single();
      expect(data?.needs_review).toBe(false);
      expect(data?.reviewed_at).not.toBeNull();
    } finally {
      await service.from("opportunities").update({ needs_review: true, reviewed_at: null, city: "Seoul" }).eq("id", opportunityId(9));
    }
  });

  it("approves and rejects imports, one log row each; rejecting needs a reason", async () => {
    try {
      await logged("admin_review_import", { event: opportunityId(9), decision: "approve", reason: "" });
      await service.from("opportunities").update({ needs_review: true, reviewed_at: null }).eq("id", opportunityId(9));
      const row = await logged("admin_review_import", { event: opportunityId(9), decision: "reject", reason: "Not a real event" });
      expect(row).toMatchObject({ action: "reject", details: { before: { status: "live" }, after: { status: "removed" } } });
    } finally {
      await service.from("opportunities").update({ needs_review: true, reviewed_at: null, status: "live" }).eq("id", opportunityId(9));
    }
  });

  it("reading the overview and a person's summary isn't logged", async () => {
    const before = await logCount();
    const overview = await admin.rpc("admin_overview");
    expect(overview.error).toBeNull();
    expect(overview.data.signups).toHaveLength(30);
    expect(overview.data).toMatchObject({ open_reports: expect.any(Number), suspended: 0 });
    const summary = await admin.rpc("admin_person_summary", { person: id(7) });
    expect(summary.data).toMatchObject({ admin: false, teams_owned: expect.any(Number), suspension: null });
    expect(await logCount()).toBe(before);
  });
});

describe("the admin log", () => {
  it("nobody can add, change or delete a row, the admin included", async () => {
    await admin.rpc("admin_set_featured", { event: opportunityId(1), featured: false });
    const [row] = await rows("admin_actions", "id");
    await expectNoChange(["admin_actions"], async () => {
      for (const client of [admin, userA, adminNoCode]) {
        expectRefused(await client.from("admin_actions").insert({ admin_id: ADMIN, action: "hide", target_type: "person", target_id: A }));
        await client.from("admin_actions").update({ reason: "Rewritten" }).eq("id", row.id);
        await client.from("admin_actions").delete().eq("id", row.id);
      }
    });
  });

  it("not even with the service role, which skips every policy", async () => {
    const [row] = await rows("admin_actions", "id");
    await expectNoChange(["admin_actions"], async () => {
      expectRefused(await service.from("admin_actions").update({ reason: "Rewritten" }).eq("id", row.id).select());
      expectRefused(await service.from("admin_actions").delete().eq("id", row.id).select());
    });
  });

  it("only the admin, with the code entered, reads it", async () => {
    expect((await admin.from("admin_actions").select("id")).data?.length).toBeGreaterThan(0);
    for (const client of [userA, adminNoCode, signedOut()]) expect((await client.from("admin_actions").select("id")).data ?? []).toEqual([]);
  });
});

describe("reports", () => {
  afterEach(async () => {
    await service.from("reports").delete().eq("reporter_id", A);
    await service.from("opportunities").update({ status: "live" }).eq("id", opportunityId(1));
  });

  it("members report people, teams and events as themselves, once each, for a listed reason", async () => {
    const add = (row: Record<string, unknown>) => userA.from("reports").insert(row);
    expect((await add({ target_type: "person", target_id: id(13), reason: "spam", note: "Same message to everyone" })).error).toBeNull();
    expect((await add({ target_type: "team", target_id: teamId(5), reason: "fake" })).error).toBeNull();
    expect((await add({ target_type: "event", target_id: opportunityId(3), reason: "expired" })).error).toBeNull();
    expect(await rows("reports", "reporter_id, status")).toContainEqual({ reporter_id: A, status: "open" });
    await expectNoChange(["reports"], async () => {
      expectRefused(await add({ target_type: "person", target_id: id(13), reason: "spam" })); // twice
      expectRefused(await add({ target_type: "person", target_id: A, reason: "spam" })); // yourself
      expectRefused(await add({ target_type: "team", target_id: teamId(1), reason: "fake" })); // A's own team
      expectRefused(await add({ target_type: "person", target_id: id(14), reason: "expired" })); // an event's reason
      expectRefused(await add({ target_type: "event", target_id: opportunityId(3), reporter_id: id(2), reason: "fake" }));
      expectRefused(await add({ target_type: "person", target_id: id(14), reason: "spam", status: "dismissed" }));
    });
  });

  it("3 open reports hide a live event", async () => {
    await service.from("reports").insert([
      { target_type: "event", target_id: opportunityId(1), reporter_id: A, reason: "fake" },
      { target_type: "event", target_id: opportunityId(1), reporter_id: id(12), reason: "fake" },
    ]);
    expect((await service.from("opportunities").select("status").eq("id", opportunityId(1)).single()).data).toEqual({ status: "live" });
    await service.from("reports").insert({ target_type: "event", target_id: opportunityId(1), reporter_id: id(16), reason: "duplicate" });
    expect((await service.from("opportunities").select("status").eq("id", opportunityId(1)).single()).data).toEqual({ status: "hidden" });
    await service.from("reports").delete().eq("target_id", opportunityId(1));
  });
});

describe("hidden people and teams", () => {
  it("only an admin function sets hidden_at: not the person, not the team's owner", async () => {
    await expectNoChange(["profiles", "teams"], async () => {
      expectRefused(await userA.from("profiles").update({ hidden_at: new Date().toISOString(), headline: "x" }).eq("id", A).select());
      expectRefused(await (await signInAs(13)).from("profiles").update({ hidden_at: new Date().toISOString() }).eq("id", id(13)).select());
      expectRefused(await (await signInAs(11)).from("teams").update({ hidden_at: new Date().toISOString() }).eq("id", teamId(5)).select());
    });
  });
});

describe("suspended members", () => {
  // Student 07 owns team 2, added event 2, has experience, projects, connections and notifications
  let suspended: Client;
  const me = id(7);

  beforeAll(async () => {
    await service.from("suspensions").insert({ user_id: me, reason: "Testing" });
    suspended = await signInAs(7);
  });

  afterEach(async () => {
    await service.from("suspensions").upsert({ user_id: me, reason: "Testing" });
  });

  afterAll(async () => {
    await service.from("suspensions").delete().eq("user_id", me);
  });

  it("can read, and see their own suspension", async () => {
    expect((await suspended.from("teams").select("id")).data?.length).toBeGreaterThan(0);
    expect((await suspended.from("profiles").select("id").eq("id", me)).data).toEqual([{ id: me }]);
    expect((await suspended.from("suspensions").select("user_id, reason")).data).toEqual([{ user_id: me, reason: "Testing" }]);
  });

  it("can't insert, update or delete anything in any table, their own rows included", async () => {
    await expectNoChange(
      [...allTables, "team_entries", "team_projects", "team_project_members"],
      async () => {
        await triesToWriteEverything(suspended, me);
        await suspended.from("profiles").update({ headline: "Still here" }).eq("id", me);
        await suspended.from("teams").update({ roles: ["Backend"] }).eq("id", teamId(2));
        await suspended.from("team_entries").insert({ team_id: teamId(2), opportunity_id: opportunityId(3) });
        await suspended.from("team_entries").update({ status: "registered" }).eq("team_id", teamId(2));
        await suspended.from("experiences").delete().eq("user_id", me);
        await suspended.from("connections").insert({ sender_id: me, receiver_id: id(15) });
        await suspended.from("notifications").update({ read: true }).eq("user_id", me);
        await suspended.from("reports").insert({ target_type: "person", target_id: id(15), reason: "spam" });
        await suspended.from("suspensions").delete().eq("user_id", me);
      },
    );
  });

  it("can't upload, replace or delete files, or delete their account", async () => {
    const path = `${me}/suspended-${Date.now()}.png`;
    expectRefused(await suspended.storage.from("media").upload(path, new Blob(["x"], { type: "image/png" }), { contentType: "image/png" }));
    expect((await service.storage.from("media").list(me)).data?.some((f) => path.endsWith(f.name))).toBe(false);
    const { data } = await suspended.rpc("my_account_deletion_blocker");
    expect(data).toContain("suspended");
    await expectNoChange(["profiles"], async () => {
      expectRefused(await suspended.rpc("delete_my_account"));
    });
  });

  it("can write again once unsuspended", async () => {
    await service.from("suspensions").delete().eq("user_id", me);
    const before = (await service.from("profiles").select("headline").eq("id", me).single()).data?.headline;
    const { error } = await suspended.from("profiles").update({ headline: "Back" }).eq("id", me);
    expect(error).toBeNull();
    expect((await service.from("profiles").select("headline").eq("id", me).single()).data).toEqual({ headline: "Back" });
    await service.from("profiles").update({ headline: before }).eq("id", me);
  });
});

describe("visits", () => {
  it("anyone can count a story or link visit; nobody reads the counts through the API", async () => {
    const today = async (ref: string) =>
      Number((await service.from("visits").select("count").eq("ref", ref).eq("day", new Date().toISOString().slice(0, 10)).maybeSingle()).data?.count ?? 0);
    const before = await today("story");
    expect((await signedOut().rpc("count_visit", { source: "story" })).error).toBeNull();
    expect((await userA.rpc("count_visit", { source: "story" })).error).toBeNull();
    await signedOut().rpc("count_visit", { source: "elsewhere" });
    expect(await today("story")).toBe(before + 2);
    expect((await service.from("visits").select("ref").eq("ref", "elsewhere")).data).toEqual([]);
    for (const client of [signedOut(), userA, admin]) expect((await client.from("visits").select("*")).data ?? []).toEqual([]);
  });
});
