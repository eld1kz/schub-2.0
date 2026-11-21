// Team invites (supabase/team-invites.sql): invites are team_applications rows with direction = 'invite'
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { A, B, expectNoChange, expectRefused, id, service, signInAs, teamId, type Client } from "./helpers";

// User A (01) owns team 1 (Backend, Designer). B (02) has no connection with A and is open to a team.
// 03 is A's connection; 13 isn't open to a team and isn't connected to A.
const team = teamId(1);
let userA: Client, userB: Client, user3: Client;
const extraUsers: string[] = [];
const extraTeams: string[] = [];

beforeAll(async () => {
  [userA, userB, user3] = await Promise.all([signInAs(1), signInAs(2), signInAs(3)]);
});

afterEach(async () => {
  await service.from("team_applications").delete().eq("team_id", team);
  await service.from("profiles").update({ open_to_collaborate: true }).eq("id", id(3));
  for (const t of extraTeams.splice(0)) await service.from("teams").delete().eq("id", t);
  for (const u of extraUsers.splice(0)) await service.auth.admin.deleteUser(u);
});

const invite = (client: Client, user: string, role = "Backend", teamOf = team) =>
  client.from("team_applications").insert({ team_id: teamOf, user_id: user, role, direction: "invite" }).select("id").single();
const row = async (user: string) => (await service.from("team_applications").select("*").eq("team_id", team).eq("user_id", user).maybeSingle()).data;
const notifications = async (user: string, type: string) =>
  (await service.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user).eq("actor_id", A).eq("type", type)).count ?? 0;

describe("inviting", () => {
  it("the owner can invite someone open to a team to one of the team's roles, and they're notified", async () => {
    await service.from("notifications").delete().eq("user_id", B).eq("actor_id", A).eq("type", "team_invite");
    const { error } = await invite(userA, B);
    expect(error).toBeNull();
    expect(await row(B)).toMatchObject({ direction: "invite", status: "pending", role: "Backend" });
    expect(await notifications(B, "team_invite")).toBe(1);
  });

  it("the owner can invite a connection who isn't open to a team", async () => {
    await service.from("profiles").update({ open_to_collaborate: false }).eq("id", id(3));
    expect((await invite(userA, id(3))).error).toBeNull();
  });

  it("refuses people who aren't open and aren't your connection, yourself, other roles and other people's teams", async () => {
    await expectNoChange(["team_applications"], async () => {
      expectRefused(await invite(userA, id(13)));
      expectRefused(await invite(userA, A));
      expectRefused(await invite(userA, B, "Wizard"));
      expectRefused(await invite(userB, id(19), "Backend"));
      expectRefused(await invite(userB, B));
      expectRefused(await userA.from("team_applications").insert({ team_id: team, user_id: B, role: "Backend", direction: "invite", status: "accepted" }));
    });
  });

  it("nobody can be invited twice, or after applying", async () => {
    expect((await userB.from("team_applications").insert({ team_id: team, user_id: B, role: "Designer" })).error).toBeNull();
    expectRefused(await invite(userA, B));
  });

  it("applicants can't turn their application into an invite", async () => {
    expectRefused(await userB.from("team_applications").insert({ team_id: team, user_id: B, role: "Backend", direction: "invite" }));
    const { data } = await userB.from("team_applications").insert({ team_id: team, user_id: B, role: "Backend" }).select("id").single();
    expectRefused(await userB.from("team_applications").update({ direction: "invite" }).eq("id", data?.id));
    expect((await row(B))?.direction).toBe("application");
  });
});

describe("answering", () => {
  it("the invited person accepts and becomes a member in that role, and the owner hears about it", async () => {
    await service.from("notifications").delete().eq("user_id", A).eq("actor_id", B).eq("type", "invite_accepted");
    const { data } = await invite(userA, B);
    expect((await userB.from("team_applications").update({ status: "accepted" }).eq("id", data?.id).select("id")).data).toHaveLength(1);
    expect((await row(B))?.status).toBe("accepted");
    const { count } = await service.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", A).eq("actor_id", B).eq("type", "invite_accepted");
    expect(count).toBe(1);
    // Members see each other's contact details, same as after an accepted application
    const { data: contact } = await userB.rpc("contact_for", { profile_id: A });
    expect(contact).toHaveLength(1);
  });

  it("the owner can't answer their own invite, and nobody else can either", async () => {
    const { data } = await invite(userA, B);
    await expectNoChange(["team_applications"], async () => {
      await userA.from("team_applications").update({ status: "accepted" }).eq("id", data?.id);
      await user3.from("team_applications").update({ status: "accepted" }).eq("id", data?.id);
    });
  });

  it("a declined invite stays declined, so it can't be accepted later or sent again", async () => {
    const { data } = await invite(userA, B);
    await userB.from("team_applications").update({ status: "declined" }).eq("id", data?.id);
    await expectNoChange(["team_applications"], async () => {
      await userB.from("team_applications").update({ status: "accepted" }).eq("id", data?.id);
      expectRefused(await invite(userA, B));
    });
  });

  it("the owner can still only answer applications, not change invites", async () => {
    const { data } = await userB.from("team_applications").insert({ team_id: team, user_id: B, role: "Backend" }).select("id").single();
    expect((await userA.from("team_applications").update({ status: "accepted" }).eq("id", data?.id).select("id")).data).toHaveLength(1);
  });
});

describe("filled roles", () => {
  it("nobody can be invited to a role someone was already accepted for", async () => {
    await service.from("team_applications").insert({ team_id: team, user_id: id(9), role: "Backend", status: "accepted" });
    await expectNoChange(["team_applications"], async () => {
      expectRefused(await invite(userA, B, "Backend"));
    });
    expect((await invite(userA, B, "Designer")).error).toBeNull();
  });

  it("an invite can't be accepted once its role is filled, but can still be declined or withdrawn", async () => {
    const { data } = await invite(userA, B, "Backend");
    await service.from("team_applications").insert({ team_id: team, user_id: id(9), role: "Backend", status: "accepted" });
    await expectNoChange(["team_applications"], async () => {
      expectRefused(await userB.from("team_applications").update({ status: "accepted" }).eq("id", data?.id));
    });
    expect((await userA.from("team_applications").delete().eq("id", data?.id).select("id")).data).toHaveLength(1);
  });

  it("someone who declined an invite can clear it and apply", async () => {
    const { data } = await invite(userA, B, "Backend");
    await userB.from("team_applications").update({ status: "declined" }).eq("id", data?.id);
    expect((await userB.from("team_applications").delete().eq("id", data?.id).select("id")).data).toHaveLength(1);
    expect((await userB.from("team_applications").insert({ team_id: team, user_id: B, role: "Designer" })).error).toBeNull();
  });
});

describe("withdrawing", () => {
  it("the owner can withdraw a pending invite, but not remove someone who accepted", async () => {
    const { data } = await invite(userA, B);
    expect((await userA.from("team_applications").delete().eq("id", data?.id).select("id")).data).toHaveLength(1);
    const { data: again } = await invite(userA, B);
    await userB.from("team_applications").update({ status: "accepted" }).eq("id", again?.id);
    await expectNoChange(["team_applications"], () => userA.from("team_applications").delete().eq("id", again?.id));
  });

  it("nobody else can withdraw it", async () => {
    const { data } = await invite(userA, B);
    await expectNoChange(["team_applications"], () => user3.from("team_applications").delete().eq("id", data?.id));
  });

  it("withdrawing and inviting again notifies only once a day", async () => {
    await service.from("notifications").delete().eq("user_id", B).eq("actor_id", A).eq("type", "team_invite");
    for (let i = 0; i < 4; i++) {
      const { data, error } = await invite(userA, B);
      expect(error).toBeNull();
      await userA.from("team_applications").delete().eq("id", data?.id);
    }
    expect(await notifications(B, "team_invite")).toBe(1);
  });
});

describe("daily cap", () => {
  it("an owner can send up to 10 invites a day", async () => {
    // Earlier invites from A today count too (rows and notifications), so start from none
    await service.from("team_applications").delete().eq("direction", "invite");
    await service.from("notifications").delete().eq("actor_id", A).eq("type", "team_invite");
    const people: string[] = [];
    for (let i = 0; i < 11; i++) {
      const { data, error } = await service.auth.admin.createUser({ email: `invitee-${crypto.randomUUID()}@schub.test`, email_confirm: true, user_metadata: { name: `Invitee ${i}` } });
      if (error || !data.user) throw error;
      people.push(data.user.id);
    }
    extraUsers.push(...people);
    for (const person of people.slice(0, 10)) expect((await invite(userA, person)).error).toBeNull();
    const refused = await invite(userA, people[10]);
    expect(refused.error?.message).toContain("10 invitations a day");
  });

  it("withdrawn invites still count, so inviting and withdrawing can't notify more than 10 people a day", async () => {
    await service.from("team_applications").delete().eq("direction", "invite");
    await service.from("notifications").delete().eq("actor_id", A).eq("type", "team_invite");
    const people: string[] = [];
    for (let i = 0; i < 11; i++) {
      const { data, error } = await service.auth.admin.createUser({ email: `withdrawn-${crypto.randomUUID()}@schub.test`, email_confirm: true, user_metadata: { name: `Withdrawn ${i}` } });
      if (error || !data.user) throw error;
      people.push(data.user.id);
    }
    extraUsers.push(...people);
    for (const person of people.slice(0, 10)) {
      const { data, error } = await invite(userA, person);
      expect(error).toBeNull();
      await userA.from("team_applications").delete().eq("id", data?.id);
    }
    expect((await invite(userA, people[10])).error?.message).toContain("10 invitations a day");
  });

  it("invites you receive don't count against your own applications", async () => {
    await service.from("team_applications").delete().eq("direction", "invite");
    await service.from("notifications").delete().eq("actor_id", A).eq("type", "team_invite");
    expect((await invite(userA, B)).error).toBeNull();
    const { count } = await service.from("team_applications").select("id", { count: "exact", head: true }).eq("user_id", B).eq("direction", "application").gt("created_at", new Date(Date.now() - 86_400_000).toISOString());
    // B can still apply until the 10 applications a day are used up by applications alone
    expect(count ?? 0).toBeLessThan(10);
    expect((await userB.from("team_applications").insert({ team_id: teamId(5), user_id: B, role: "Marketing" })).error).toBeNull();
    await service.from("team_applications").delete().eq("team_id", teamId(5)).eq("user_id", B);
  });
});
