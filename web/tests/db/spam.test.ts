// Ways to flood someone's notifications, and text with no length limit.
// These are known issues from the security review (Medium), written as the behavior we want and marked
// it.fails until they're fixed. When one starts "failing", the fix landed: turn it back into a normal it().
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { A, B, id, service, signInAs, teamId, type Client } from "./helpers";

let userA: Client;

beforeAll(async () => {
  userA = await signInAs(1);
});

const notificationsFor = async (user: string, type: string) =>
  (await service.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user).eq("type", type)).count ?? 0;

afterEach(async () => {
  await service.from("connections").delete().eq("sender_id", A).eq("receiver_id", B);
  await service.from("awards").delete().eq("user_id", A).eq("event_name", "Spam test");
  await service.from("team_applications").delete().eq("user_id", A).eq("team_id", teamId(3));
  await service.from("profiles").update({ name: "Minji Placeholder" }).eq("id", A);
});

describe("notification floods", () => {
  it.fails("KNOWN ISSUE (Medium): withdrawing and re-sending a connection request doesn't notify again", async () => {
    const before = await notificationsFor(B, "connection_request");
    for (let i = 0; i < 5; i++) {
      await userA.from("connections").insert({ sender_id: A, receiver_id: B });
      await userA.from("connections").delete().eq("sender_id", A).eq("receiver_id", B);
    }
    expect(await notificationsFor(B, "connection_request")).toBeLessThanOrEqual(before + 1);
  });

  it.fails("KNOWN ISSUE (Medium): untagging and re-tagging someone on an award doesn't notify again", async () => {
    const { data: award } = await userA.from("awards").insert({ user_id: A, placement: "Winner", event_name: "Spam test", awarded_on: "2025-01-01" }).select("id").single();
    const before = await notificationsFor(B, "award_tag");
    for (let i = 0; i < 5; i++) {
      await userA.from("award_teammates").insert({ award_id: award?.id, user_id: B });
      await userA.from("award_teammates").delete().eq("award_id", award?.id).eq("user_id", B);
    }
    expect(await notificationsFor(B, "award_tag")).toBeLessThanOrEqual(before + 1);
  });

  it.fails("KNOWN ISSUE (Medium): withdrawing and re-applying to a team doesn't notify the owner again", async () => {
    const before = await notificationsFor(B, "team_application");
    for (let i = 0; i < 5; i++) {
      await userA.from("team_applications").insert({ team_id: teamId(3), user_id: A, role: "Frontend" });
      await userA.from("team_applications").delete().eq("team_id", teamId(3)).eq("user_id", A);
    }
    expect(await notificationsFor(B, "team_application")).toBeLessThanOrEqual(before + 1);
  });

  it.fails("KNOWN ISSUE (Medium): you can only tag people you're connected to or were on a team with", async () => {
    // A and 19 have no connection and no team in common
    const { data: award } = await userA.from("awards").insert({ user_id: A, placement: "Winner", event_name: "Spam test", awarded_on: "2025-01-01" }).select("id").single();
    const { error } = await userA.from("award_teammates").insert({ award_id: award?.id, user_id: id(19) });
    expect(error).not.toBeNull();
  });
});

describe("length limits", () => {
  // The name is copied into other people's notifications ("<name> wants to connect")
  it.fails("KNOWN ISSUE (High): profile name, university and bio have length limits", async () => {
    const long = "x".repeat(20_000);
    expect((await userA.from("profiles").update({ name: long }).eq("id", A)).error).not.toBeNull();
    expect((await userA.from("profiles").update({ university: long }).eq("id", A)).error).not.toBeNull();
    expect((await userA.from("profiles").update({ bio: long }).eq("id", A)).error).not.toBeNull();
  });

  it.fails("KNOWN ISSUE (High): team roles and interests have length and count limits", async () => {
    const long = "x".repeat(5_000);
    expect((await userA.from("profiles").update({ interests: Array(500).fill(long) }).eq("id", A)).error).not.toBeNull();
    const { error } = await userA.from("teams").insert({ owner_id: A, title: "Spam test", roles: [long] });
    if (!error) await service.from("teams").delete().eq("title", "Spam test");
    expect(error).not.toBeNull();
  });
});
