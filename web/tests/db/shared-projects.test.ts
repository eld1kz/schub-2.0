// Shared projects (supabase/shared-projects.sql): team_projects and team_project_members
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { A, expectNoChange, expectRefused, id, service, signInAs, signedOut, teamId, type Client } from "./helpers";

// Team 2 "Full Sample Team": owner 07, members 08 (Backend) and 14 (ML), for Mock AI Challenge Winter (upcoming).
// Team 5 "Fakename Growth Squad": owner 11, no event, nobody accepted.
// Team 4 "Testerson Robotics": owner 14, members 16 and 01 (user A), for the upcoming Placeholder Hack Seoul 2027.
const ended = "00000000-0000-4000-9000-000000000004"; // Placeholder Hack 2025, long over
let owner7: Client, member8: Client, member14: Client, owner11: Client, userA: Client;

beforeAll(async () => {
  [owner7, member8, member14, owner11, userA] = await Promise.all([signInAs(7), signInAs(8), signInAs(14), signInAs(11), signInAs(1)]);
});

afterEach(async () => {
  await service.from("team_projects").delete().in("team_id", [teamId(2), teamId(5), teamId(4)]);
  await service.from("teams").update({ opportunity_id: "00000000-0000-4000-9000-000000000002" }).eq("id", teamId(2));
});

const record = (client: Client, team: string, fields: Record<string, unknown> = {}) =>
  client.from("team_projects").insert({ team_id: team, title: "Built it", ...fields }).select("id").single();
const membersOf = async (project: string) =>
  ((await service.from("team_project_members").select("user_id, status, hidden").eq("project_id", project)).data ?? []).sort((a, b) => a.user_id.localeCompare(b.user_id));
// Team 2's event is upcoming; this moves it to one that has ended
const endEvent = () => service.from("teams").update({ opportunity_id: ended }).eq("id", teamId(2));

describe("recording a project", () => {
  it("a team with no event can record it any time; the owner is on it and nobody else was accepted", async () => {
    const { data, error } = await record(owner11, teamId(5), { pitch: "Growth", result: "Finalist", url: "https://example.com" });
    expect(error).toBeNull();
    expect(await membersOf(data?.id)).toEqual([{ user_id: id(11), status: "confirmed", hidden: false }]);
  });

  it("a team for an event can't record it before the event has ended", async () => {
    await expectNoChange(["team_projects"], async () => {
      expectRefused(await record(owner7, teamId(2)));
    });
  });

  it("after the event, every accepted member gets a pending confirmation and a notification", async () => {
    await endEvent();
    await service.from("notifications").delete().eq("actor_id", id(7)).eq("type", "shared_project");
    const { data, error } = await record(owner7, teamId(2));
    expect(error).toBeNull();
    expect(await membersOf(data?.id)).toEqual([
      { user_id: id(7), status: "confirmed", hidden: false },
      { user_id: id(8), status: "pending", hidden: false },
      { user_id: id(14), status: "pending", hidden: false },
    ]);
    const { count } = await service.from("notifications").select("id", { count: "exact", head: true }).eq("actor_id", id(7)).eq("type", "shared_project");
    expect(count).toBe(2);
  });

  it("only the owner records it, once per team, with real links and sane lengths", async () => {
    await endEvent();
    await expectNoChange(["team_projects", "team_project_members"], async () => {
      expectRefused(await record(member8, teamId(2)));
      expectRefused(await record(userA, teamId(5)));
      expectRefused(await record(signedOut(), teamId(5)));
      expectRefused(await record(owner7, teamId(2), { url: "javascript:alert(1)" }));
      expectRefused(await record(owner7, teamId(2), { title: "x".repeat(81) }));
      expectRefused(await record(owner7, teamId(2), { pitch: "x".repeat(201) }));
      expectRefused(await record(owner7, teamId(2), { title: "  " }));
      expectRefused(await record(owner7, teamId(2), { title: ` ${" ".repeat(100000)}x` }));
    });
    expect((await record(owner7, teamId(2))).error).toBeNull();
    expectRefused(await record(owner7, teamId(2), { title: "Again" }));
  });

  it("nobody can add members by hand", async () => {
    const { data } = await record(owner11, teamId(5));
    await expectNoChange(["team_project_members"], async () => {
      expectRefused(await owner11.from("team_project_members").insert({ project_id: data?.id, user_id: A, status: "confirmed" }));
      expectRefused(await userA.from("team_project_members").insert({ project_id: data?.id, user_id: A, status: "confirmed" }));
    });
  });
});

describe("joining later", () => {
  it("someone accepted after it was recorded is asked to confirm too", async () => {
    const { data } = await record(owner11, teamId(5));
    await service.from("notifications").delete().eq("user_id", id(5)).eq("actor_id", id(11)).eq("type", "shared_project");
    // Student 05's application to team 5 was declined in the seed; the owner accepts it now
    await owner11.from("team_applications").update({ status: "accepted" }).eq("team_id", teamId(5)).eq("user_id", id(5));
    expect((await membersOf(data?.id)).find((m) => m.user_id === id(5))).toEqual({ user_id: id(5), status: "pending", hidden: false });
    const { count } = await service.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", id(5)).eq("type", "shared_project");
    expect(count).toBe(1);
    await service.from("team_applications").update({ status: "declined" }).eq("team_id", teamId(5)).eq("user_id", id(5));
  });

  it("an event with no dates at all doesn't keep the team waiting", async () => {
    await service.from("opportunities").update({ starts_at: null, ends_at: null, deadline: null }).eq("id", "00000000-0000-4000-9000-000000000003");
    const { data: team } = await service.from("teams").insert({ owner_id: id(11), title: "Dateless team", roles: ["Backend"], opportunity_id: "00000000-0000-4000-9000-000000000003" }).select("id").single();
    try {
      expect((await record(owner11, team?.id)).error).toBeNull();
    } finally {
      await service.from("teams").delete().eq("id", team?.id);
      await service.from("opportunities").update({ deadline: "2027-03-01" }).eq("id", "00000000-0000-4000-9000-000000000003");
    }
  });
});

describe("confirming", () => {
  it("members confirm or decline for themselves, and can hide it from their profile", async () => {
    await endEvent();
    const { data } = await record(owner7, teamId(2));
    expect((await member8.from("team_project_members").update({ status: "confirmed" }).eq("project_id", data?.id).eq("user_id", id(8)).select("user_id")).data).toHaveLength(1);
    expect((await member14.from("team_project_members").update({ status: "declined" }).eq("project_id", data?.id).eq("user_id", id(14)).select("user_id")).data).toHaveLength(1);
    expect((await member8.from("team_project_members").update({ hidden: true }).eq("project_id", data?.id).eq("user_id", id(8)).select("user_id")).data).toHaveLength(1);
    expect(await membersOf(data?.id)).toEqual([
      { user_id: id(7), status: "confirmed", hidden: false },
      { user_id: id(8), status: "confirmed", hidden: true },
      { user_id: id(14), status: "declined", hidden: false },
    ]);
  });

  it("nobody answers for someone else, not even the owner, and nobody moves a confirmation to another person or project", async () => {
    await endEvent();
    const { data } = await record(owner7, teamId(2));
    await expectNoChange(["team_project_members"], async () => {
      await owner7.from("team_project_members").update({ status: "confirmed" }).eq("project_id", data?.id).eq("user_id", id(8));
      await member14.from("team_project_members").update({ status: "confirmed" }).eq("project_id", data?.id).eq("user_id", id(8));
      expectRefused(await member8.from("team_project_members").update({ user_id: A }).eq("project_id", data?.id).eq("user_id", id(8)));
      expectRefused(await member8.from("team_project_members").update({ status: "pending" }).eq("project_id", data?.id).eq("user_id", id(8)));
      await member8.from("team_project_members").delete().eq("project_id", data?.id);
    });
  });

  it("pending and declined members are private to themselves and the owner; confirmed ones are public", async () => {
    await endEvent();
    const { data } = await record(owner7, teamId(2));
    await member14.from("team_project_members").update({ status: "declined" }).eq("project_id", data?.id).eq("user_id", id(14));
    const seen = async (client: Client) => ((await client.from("team_project_members").select("user_id").eq("project_id", data?.id)).data ?? []).map((r) => r.user_id).sort();
    expect(await seen(signedOut())).toEqual([id(7)]);
    expect(await seen(userA)).toEqual([id(7)]);
    expect(await seen(member8)).toEqual([id(7), id(8)]);
    expect(await seen(owner7)).toEqual([id(7), id(8), id(14)]);
  });
});

describe("editing", () => {
  it("changing the title or the result asks everyone who confirmed again; the pitch and links don't", async () => {
    await endEvent();
    const { data } = await record(owner7, teamId(2));
    await member8.from("team_project_members").update({ status: "confirmed" }).eq("project_id", data?.id).eq("user_id", id(8));
    await member14.from("team_project_members").update({ status: "declined" }).eq("project_id", data?.id).eq("user_id", id(14));

    await owner7.from("team_projects").update({ pitch: "New pitch", url: "https://example.com/new" }).eq("id", data?.id);
    expect((await membersOf(data?.id))[1].status).toBe("confirmed");

    await service.from("notifications").delete().eq("actor_id", id(7)).eq("type", "shared_project_changed");
    await owner7.from("team_projects").update({ result: "Winner" }).eq("id", data?.id);
    expect(await membersOf(data?.id)).toEqual([
      { user_id: id(7), status: "confirmed", hidden: false },
      { user_id: id(8), status: "pending", hidden: false },
      { user_id: id(14), status: "declined", hidden: false },
    ]);
    const { count } = await service.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", id(8)).eq("type", "shared_project_changed");
    expect(count).toBe(1);
  });

  it("only the owner edits or deletes it, and it can't be moved to another team", async () => {
    const { data } = await record(owner11, teamId(5));
    await expectNoChange(["team_projects"], async () => {
      await userA.from("team_projects").update({ title: "Hacked" }).eq("id", data?.id);
      await userA.from("team_projects").delete().eq("id", data?.id);
      expectRefused(await owner11.from("team_projects").update({ team_id: teamId(4) }).eq("id", data?.id));
    });
    expect((await owner11.from("team_projects").delete().eq("id", data?.id).select("id")).data).toHaveLength(1);
  });

  it("the owner can't delete it once another member has confirmed it, but can still edit it", async () => {
    await endEvent();
    const { data } = await record(owner7, teamId(2));
    await member8.from("team_project_members").update({ status: "confirmed" }).eq("project_id", data?.id).eq("user_id", id(8));
    await expectNoChange(["team_projects"], () => owner7.from("team_projects").delete().eq("id", data?.id));
    expect((await owner7.from("team_projects").update({ pitch: "Still editable" }).eq("id", data?.id).select("id")).data).toHaveLength(1);
  });
});
