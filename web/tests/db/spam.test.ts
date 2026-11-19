// Ways to flood someone's notifications (supabase/notification-limits.sql). (Length limits are in limits.test.ts.)
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { A, B, expectRefused, id, service, signInAs, teamId, type Client } from "./helpers";

let userA: Client;
const extraUsers: string[] = [];
const extraTeams: string[] = [];

beforeAll(async () => {
  userA = await signInAs(1);
});

const notificationsFor = async (user: string, type: string) =>
  (await service.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user).eq("type", type)).count ?? 0;

// Starts the 24 hours afresh, whatever other test files sent earlier
const forgetNotifications = (user: string, type: string) => service.from("notifications").delete().eq("user_id", user).eq("actor_id", A).eq("type", type);

const newAward = async () =>
  (await userA.from("awards").insert({ user_id: A, placement: "Winner", event_name: "Spam test", awarded_on: "2025-01-01" }).select("id").single()).data?.id as string;

// Fresh people with nothing in common with anyone
async function freshPeople(n: number) {
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const { data, error } = await service.auth.admin.createUser({ email: `spam-${crypto.randomUUID()}@schub.test`, email_confirm: true, user_metadata: { name: `Spam Target ${i}` } });
    if (error || !data.user) throw error;
    ids.push(data.user.id);
  }
  extraUsers.push(...ids);
  return ids;
}

const sentToday = async (table: string, column: string, value: string) =>
  (await service.from(table).select("*", { count: "exact", head: true }).eq(column, value).gt("created_at", new Date(Date.now() - 86_400_000).toISOString())).count ?? 0;

afterEach(async () => {
  await service.from("connections").delete().eq("sender_id", A).eq("receiver_id", B);
  await service.from("awards").delete().eq("user_id", A).eq("event_name", "Spam test");
  await service.from("team_applications").delete().eq("user_id", A).eq("team_id", teamId(3));
  for (const team of extraTeams.splice(0)) await service.from("teams").delete().eq("id", team);
  for (const user of extraUsers.splice(0)) await service.auth.admin.deleteUser(user);
});

describe("no repeat notifications within 24 hours", () => {
  it("withdrawing and re-sending a connection request notifies once", async () => {
    await forgetNotifications(B, "connection_request");
    const before = await notificationsFor(B, "connection_request");
    for (let i = 0; i < 5; i++) {
      expect((await userA.from("connections").insert({ sender_id: A, receiver_id: B })).error).toBeNull();
      await userA.from("connections").delete().eq("sender_id", A).eq("receiver_id", B);
    }
    expect(await notificationsFor(B, "connection_request")).toBe(before + 1);
  });

  it("untagging and re-tagging someone on an award notifies once", async () => {
    const award = await newAward();
    const teammate = id(16); // on team 4 with A
    await forgetNotifications(teammate, "award_tag");
    const before = await notificationsFor(teammate, "award_tag");
    for (let i = 0; i < 5; i++) {
      expect((await userA.from("award_teammates").insert({ award_id: award, user_id: teammate })).error).toBeNull();
      await userA.from("award_teammates").delete().eq("award_id", award).eq("user_id", teammate);
    }
    expect(await notificationsFor(teammate, "award_tag")).toBe(before + 1);
  });

  it("withdrawing and re-applying to a team notifies the owner once", async () => {
    await forgetNotifications(B, "team_application");
    const before = await notificationsFor(B, "team_application");
    for (let i = 0; i < 5; i++) {
      expect((await userA.from("team_applications").insert({ team_id: teamId(3), user_id: A, role: "Frontend" })).error).toBeNull();
      await userA.from("team_applications").delete().eq("team_id", teamId(3)).eq("user_id", A);
    }
    expect(await notificationsFor(B, "team_application")).toBe(before + 1);
  });

  it("nobody can write a notification through the API", async () => {
    const { error } = await userA.rpc("notify", { recipient: B, actor: A, kind: "connection_request", message: "Fake", link: "/people" });
    expect(error).not.toBeNull();
  });
});

describe("who you can tag", () => {
  it("only your accepted connections and teammates", async () => {
    const award = await newAward();
    expect((await userA.from("award_teammates").insert({ award_id: award, user_id: id(3) })).error).toBeNull(); // accepted connection
    expect((await userA.from("award_teammates").insert({ award_id: award, user_id: id(14) })).error).toBeNull(); // owns team 4, A is a member
    expect((await userA.from("award_teammates").insert({ award_id: award, user_id: id(16) })).error).toBeNull(); // also a member of team 4
    expectRefused(await userA.from("award_teammates").insert({ award_id: award, user_id: id(19) })); // nothing in common
    expectRefused(await userA.from("award_teammates").insert({ award_id: award, user_id: id(5) })); // A's request is still pending
    expectRefused(await userA.from("award_teammates").insert({ award_id: award, user_id: id(18) })); // A's application is still pending
  });

  it("the award form only finds people you can tag", async () => {
    const { data } = await userA.rpc("tag_candidates");
    const ids = ((data ?? []) as { id: string }[]).map((r) => r.id).sort();
    expect(ids).toEqual([id(3), id(4), id(14), id(16)].sort());
  });
});

describe("daily caps", () => {
  it("20 connection requests a day", async () => {
    const left = 20 - (await sentToday("connections", "sender_id", A));
    const people = await freshPeople(left + 1);
    for (const person of people.slice(0, left)) expect((await userA.from("connections").insert({ sender_id: A, receiver_id: person })).error).toBeNull();
    const { error } = await userA.from("connections").insert({ sender_id: A, receiver_id: people[left] });
    expect(error?.message).toContain("20 connection requests a day");
  });

  it("10 team applications a day", async () => {
    const left = 10 - (await sentToday("team_applications", "user_id", A));
    const { data } = await service.from("teams").insert(Array.from({ length: left + 1 }, (_, i) => ({ owner_id: B, title: `Cap team ${i}`, roles: ["Frontend"] }))).select("id");
    const teams = (data ?? []).map((t) => t.id as string);
    extraTeams.push(...teams);
    for (const team of teams.slice(0, left)) expect((await userA.from("team_applications").insert({ team_id: team, user_id: A, role: "Frontend" })).error).toBeNull();
    const { error } = await userA.from("team_applications").insert({ team_id: teams[left], user_id: A, role: "Frontend" });
    expect(error?.message).toContain("10 teams a day");
  });

  it("20 award tags a day", async () => {
    const tagged = (await service.from("award_teammates").select("created_at, award:awards!inner(user_id)").eq("award.user_id", A).gt("created_at", new Date(Date.now() - 86_400_000).toISOString())).data?.length ?? 0;
    const left = 20 - tagged;
    // Connect them to A, so A may tag them
    const people = await freshPeople(left + 1);
    await service.from("connections").insert(people.map((person) => ({ sender_id: person, receiver_id: A, status: "accepted" })));
    const award = await newAward();
    for (const person of people.slice(0, left)) expect((await userA.from("award_teammates").insert({ award_id: award, user_id: person })).error).toBeNull();
    const { error } = await userA.from("award_teammates").insert({ award_id: award, user_id: people[left] });
    expect(error?.message).toContain("20 people a day");
  });
});
