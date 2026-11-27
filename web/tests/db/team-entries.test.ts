// Teams entering events and featured events (supabase/team-entries.sql)
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { A, expectNoChange, expectRefused, id, opportunityId, service, signInAs, signInAsAdmin, signedOut, teamId, type Client } from "./helpers";

// Team 2 "Full Sample Team": owner 07, members 08 (Backend) and 14 (ML), entered in opportunity 2 (upcoming).
// Team 5 "Fakename Growth Squad": owner 11, no event, nobody accepted.
// Opportunity 3 is an upcoming grant; 4 ended in 2025; 6 is hidden after reports; 7 was removed.
const grant = opportunityId(3);
let owner7: Client, member8: Client, owner11: Client, userA: Client, admin: Client;

beforeAll(async () => {
  [owner7, member8, owner11, userA, admin] = await Promise.all([signInAs(7), signInAs(8), signInAs(11), signInAs(1), signInAsAdmin()]);
});

afterEach(async () => {
  await service.from("team_entries").delete().in("team_id", [teamId(2), teamId(5)]).neq("opportunity_id", opportunityId(2));
  await service.from("team_entries").update({ status: "going" }).eq("team_id", teamId(2));
  await service.from("teams").update({ roles: ["Backend", "ML"], role_notes: {} }).eq("id", teamId(2));
  await service.from("opportunities").update({ featured: false }).in("id", [opportunityId(1), opportunityId(2)]);
  await service.from("notifications").delete().eq("type", "team_entered");
});

const enter = (client: Client, team: string, opportunity: string) => client.from("team_entries").insert({ team_id: team, opportunity_id: opportunity });
const entryOf = async (team: string, opportunity: string) =>
  (await service.from("team_entries").select("status").eq("team_id", team).eq("opportunity_id", opportunity).maybeSingle()).data;

describe("entering an event", () => {
  it("anyone can read entries, signed out too", async () => {
    const { data } = await signedOut().from("team_entries").select("team_id, status").eq("opportunity_id", opportunityId(2));
    expect(data).toEqual([{ team_id: teamId(2), status: "going" }]);
  });

  it("the owner enters their team; it starts as going and every accepted member is notified", async () => {
    expect((await enter(owner7, teamId(2), grant)).error).toBeNull();
    expect(await entryOf(teamId(2), grant)).toEqual({ status: "going" });
    const { data } = await service.from("notifications").select("user_id, actor_id, message, link").eq("type", "team_entered");
    expect((data ?? []).sort((a, b) => a.user_id.localeCompare(b.user_id))).toEqual([
      { user_id: id(8), actor_id: id(7), message: "Your team entered Notreal Startup Grant", link: `/teams/${teamId(2)}` },
      { user_id: id(14), actor_id: id(7), message: "Your team entered Notreal Startup Grant", link: `/teams/${teamId(2)}` },
    ]);
  });

  it("only the owner, only once, and only for a live event that hasn't ended", async () => {
    await expectNoChange(["team_entries", "notifications"], async () => {
      expectRefused(await enter(member8, teamId(2), grant));
      expectRefused(await enter(userA, teamId(5), grant));
      expectRefused(await enter(signedOut(), teamId(5), grant));
      expectRefused(await enter(owner7, teamId(2), opportunityId(2)));
      expectRefused(await enter(owner11, teamId(5), opportunityId(4)));
      expectRefused(await enter(owner11, teamId(5), opportunityId(6)));
      expectRefused(await enter(owner11, teamId(5), opportunityId(7)));
    });
  });

  it("a team posted the old way, with teams.opportunity_id, still gets its entry", async () => {
    const { data: team } = await service.from("teams").insert({ owner_id: id(11), title: "Old app team", roles: ["Backend"], opportunity_id: grant }).select("id").single();
    try {
      expect(await entryOf(team?.id, grant)).toEqual({ status: "going" });
    } finally {
      await service.from("teams").delete().eq("id", team?.id);
    }
  });
});

describe("status", () => {
  it("the owner moves it along, to any of the four steps", async () => {
    for (const status of ["registered", "submitted", "placed", "going"]) {
      const { data } = await owner7.from("team_entries").update({ status }).eq("team_id", teamId(2)).eq("opportunity_id", opportunityId(2)).select("status");
      expect(data).toEqual([{ status }]);
    }
  });

  it("members and others can't change it, nobody can set anything else, and an entry can't move", async () => {
    await expectNoChange(["team_entries"], async () => {
      await member8.from("team_entries").update({ status: "placed" }).eq("team_id", teamId(2));
      await userA.from("team_entries").update({ status: "placed" }).eq("team_id", teamId(2));
      expectRefused(await owner7.from("team_entries").update({ status: "won" }).eq("team_id", teamId(2)));
      expectRefused(await owner7.from("team_entries").update({ opportunity_id: grant }).eq("team_id", teamId(2)));
      expectRefused(await owner7.from("team_entries").update({ team_id: teamId(5) }).eq("team_id", teamId(2)));
    });
  });

  it("only the owner can withdraw an entry", async () => {
    await expectNoChange(["team_entries"], async () => {
      await member8.from("team_entries").delete().eq("team_id", teamId(2));
      await userA.from("team_entries").delete().eq("team_id", teamId(2));
    });
    await enter(owner7, teamId(2), grant);
    await owner7.from("team_entries").delete().eq("team_id", teamId(2)).eq("opportunity_id", grant);
    expect(await entryOf(teamId(2), grant)).toBeNull();
  });
});

describe("changing open roles", () => {
  it("the owner changes the roles and their notes, never the owner", async () => {
    const { data } = await owner7.from("teams").update({ roles: ["Backend", "ML", "Designer"], role_notes: { Designer: "Figma" } }).eq("id", teamId(2)).select("roles, role_notes");
    expect(data).toEqual([{ roles: ["Backend", "ML", "Designer"], role_notes: { Designer: "Figma" } }]);
    await expectNoChange(["teams"], async () => {
      expectRefused(await owner7.from("teams").update({ owner_id: A }).eq("id", teamId(2)));
      expectRefused(await owner7.from("teams").update({ roles: [] }).eq("id", teamId(2)));
    });
  });

  it("nobody else can change them", async () => {
    await expectNoChange(["teams"], async () => {
      await member8.from("teams").update({ roles: ["Backend"] }).eq("id", teamId(2));
      await userA.from("teams").update({ roles: ["Backend"] }).eq("id", teamId(2));
      await signedOut().from("teams").update({ roles: ["Backend"] }).eq("id", teamId(2));
    });
  });
});

describe("featured events", () => {
  it("everyone reads it; it's off unless an admin turns it on, through the logged function (supabase/admin.sql)", async () => {
    const { data } = await signedOut().from("opportunities").select("featured").eq("id", opportunityId(1)).single();
    expect(data).toEqual({ featured: false });
    expect((await admin.rpc("admin_set_featured", { event: opportunityId(1), featured: true })).error).toBeNull();
    const { data: on } = await signedOut().from("opportunities").select("featured").eq("id", opportunityId(1)).single();
    expect(on).toEqual({ featured: true });
  });

  it("nobody else can feature one, not even the person who added it, or add one already featured", async () => {
    await expectNoChange(["opportunities"], async () => {
      await owner7.from("opportunities").update({ featured: true }).eq("id", opportunityId(2)); // 07 added it
      await userA.from("opportunities").update({ featured: true }).eq("id", opportunityId(1));
      // Not directly, even for the admin: only admin_set_featured, which logs it
      await admin.from("opportunities").update({ featured: true }).eq("id", opportunityId(1));
      expectRefused(await admin.from("opportunities").insert({ title: `Admin-featured ${Date.now()}`, type: "other", url: `https://example.com/admin-featured-${Date.now()}`, deadline: "2090-01-01", submitted_by: id(20), featured: true }));
      expectRefused(
        await userA.from("opportunities").insert({ title: `Self-featured ${Date.now()}`, type: "other", url: `https://example.com/featured-${Date.now()}`, deadline: "2090-01-01", submitted_by: A, featured: true }),
      );
    });
  });
});
