import { beforeEach, describe, expect, it, vi } from "vitest";

// The real server actions with a fake database: records every update they send
const db = vi.hoisted(() => {
  const updates: { table: string; values: unknown }[] = [];
  // Database functions called, and what admin_access() answers (supabase/admin.sql)
  const rpcs: string[] = [];
  const access = { current: "none" };
  const query = (table: string) => {
    const q: Record<string, unknown> = {
      update: (values: unknown) => {
        updates.push({ table, values });
        return q;
      },
      eq: () => q,
      select: () => q,
      then: (resolve: (result: { data: null; error: null }) => void) => resolve({ data: null, error: null }),
    };
    return q;
  };
  const rpc = (fn: string) => {
    rpcs.push(fn);
    return Promise.resolve({ data: fn === "admin_access" ? access.current : null, error: null });
  };
  return { updates, rpcs, access, supabase: { from: query, rpc } };
});

vi.mock("@/lib/supabase/server", () => ({
  requireMember: async () => ({ supabase: db.supabase, userId: "me", isGuest: false }),
  requireUser: async () => ({ supabase: db.supabase, userId: "me", isGuest: false }),
  createClient: async () => db.supabase,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// Every link opens, without the network
vi.mock("@/lib/link-check", async (original) => ({ ...(await original<typeof import("@/lib/link-check")>()), linkWorks: async () => true }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect ${to}`);
  },
  notFound: () => {
    throw new Error("not found");
  },
}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

const actions = await import("./actions");
const { answerAwardTag, respond, respondToApplication } = actions;

beforeEach(() => {
  db.updates.length = 0;
  db.rpcs.length = 0;
});

describe("status arguments are whitelisted", () => {
  it("respond: only accepted or declined", async () => {
    for (const status of ["pending", "", "accepted' or 1=1", 1]) await respond("c1", status as never);
    expect(db.updates).toEqual([]);
    await respond("c1", "accepted");
    await respond("c1", "declined");
    expect(db.updates).toEqual([
      { table: "connections", values: { status: "accepted" } },
      { table: "connections", values: { status: "declined" } },
    ]);
  });

  it("respondToApplication: only accepted or declined", async () => {
    for (const status of ["pending", "ACCEPTED", null]) await respondToApplication("t1", "a1", status as never);
    expect(db.updates).toEqual([]);
    await respondToApplication("t1", "a1", "accepted");
    expect(db.updates).toEqual([{ table: "team_applications", values: { status: "accepted" } }]);
  });

  it("answerAwardTag: only confirmed or declined", async () => {
    await answerAwardTag("w1", "pending" as never);
    expect(db.updates).toEqual([]);
    await answerAwardTag("w1", "confirmed");
    expect(db.updates).toEqual([{ table: "award_teammates", values: { status: "confirmed" } }]);
  });
});

describe("admin actions check the admin on the server (lib/admin.ts) before calling the database", () => {
  const reason = () => {
    const form = new FormData();
    form.set("reason", "Spam");
    return form;
  };
  // Every admin action, with arguments that pass its own checks
  const every = () => {
    const event = reason();
    Object.entries({ title: "Real event", type: "hackathon", url: "https://example.com/e" }).forEach(([k, v]) => event.set(k, v));
    return [
      () => actions.adminHide("person", "p1", {}, reason()),
      () => actions.adminRestore("team", "t1", {}, reason()),
      () => actions.adminSuspend("p1", null, {}, reason()),
      () => actions.adminUnsuspend("p1", {}, reason()),
      () => actions.adminDismiss("r1", {}, reason()),
      () => actions.adminSetFeatured("e1", true),
      () => actions.updateOpportunity("e1", event),
      () => actions.approveImport("e1"),
      () => actions.rejectImport("e1", {}, reason()),
    ];
  };

  it("anyone who isn't an admin gets not found, and no admin function is called", async () => {
    db.access.current = "none";
    for (const call of every()) await expect(call()).rejects.toThrow("not found");
    expect(db.rpcs.filter((fn) => fn !== "admin_access")).toEqual([]);
  });

  it("an admin who hasn't entered their code is sent to the code screen, and no admin function is called", async () => {
    for (const access of ["code", "setup"]) {
      db.access.current = access;
      for (const call of every()) await expect(call()).rejects.toThrow("redirect /admin/verify");
    }
    expect(db.rpcs.filter((fn) => fn !== "admin_access")).toEqual([]);
  });

  it("an admin with the code entered calls exactly one admin function per action", async () => {
    db.access.current = "admin";
    for (const call of every()) await call().catch(() => {}); // editing redirects back to the list
    expect(db.rpcs.filter((fn) => fn !== "admin_access")).toEqual([
      "admin_hide", "admin_restore", "admin_suspend", "admin_unsuspend", "admin_dismiss", "admin_set_featured", "admin_edit_event",
      "admin_review_import", "admin_review_import",
    ]);
  });

  it("hiding, suspending, dismissing and rejecting need a reason before anything is called", async () => {
    db.access.current = "admin";
    const none = new FormData();
    expect(await actions.adminHide("person", "p1", {}, none)).toMatchObject({ error: "Give a reason." });
    expect(await actions.adminSuspend("p1", null, {}, none)).toMatchObject({ error: "Give a reason." });
    expect(await actions.adminDismiss("r1", {}, none)).toMatchObject({ error: "Give a reason." });
    expect(await actions.rejectImport("e1", {}, none)).toMatchObject({ error: "Give a reason." });
    expect(db.rpcs.filter((fn) => fn !== "admin_access")).toEqual([]);
  });
});
