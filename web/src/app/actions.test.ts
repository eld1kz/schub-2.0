import { beforeEach, describe, expect, it, vi } from "vitest";

// The real server actions with a fake database: records every update they send
const db = vi.hoisted(() => {
  const updates: { table: string; values: unknown }[] = [];
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
  return { updates, supabase: { from: query } };
});

vi.mock("@/lib/supabase/server", () => ({
  requireMember: async () => ({ supabase: db.supabase, userId: "me", isGuest: false }),
  requireUser: async () => ({ supabase: db.supabase, userId: "me", isGuest: false }),
  createClient: async () => db.supabase,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

const { answerAwardTag, respond, respondToApplication, setOpportunityStatus } = await import("./actions");

beforeEach(() => {
  db.updates.length = 0;
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

  it("setOpportunityStatus: only live or removed", async () => {
    for (const status of ["hidden", "deleted", undefined]) await setOpportunityStatus("o1", status as never);
    expect(db.updates).toEqual([]);
    await setOpportunityStatus("o1", "removed");
    expect(db.updates).toEqual([{ table: "opportunities", values: { status: "removed" } }]);
  });

  it("answerAwardTag: only confirmed or declined", async () => {
    await answerAwardTag("w1", "pending" as never);
    expect(db.updates).toEqual([]);
    await answerAwardTag("w1", "confirmed");
    expect(db.updates).toEqual([{ table: "award_teammates", values: { status: "confirmed" } }]);
  });
});
