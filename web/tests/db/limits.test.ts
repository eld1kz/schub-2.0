// Length limits (supabase/length-limits.sql). Without them one person could store a 50 MB name that
// loaded into every visitor's People page and was copied into each notification they caused.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, awardId, expectRefused, service, signInAs, signedOut, teamId, type Client } from "./helpers";

const text = (n: number) => "x".repeat(n);
let userA: Client;
let restore: Record<string, unknown>;
const created: string[] = [];

beforeAll(async () => {
  userA = await signInAs(1);
  restore = (await service.from("profiles").select("name, university, bio, interests, looking_for, github, avatar_url").eq("id", A).single()).data ?? {};
});

afterAll(async () => {
  await service.from("profiles").update(restore).eq("id", A);
  for (const user of created) await service.auth.admin.deleteUser(user);
});

const updateProfile = (fields: Record<string, unknown>) => userA.from("profiles").update(fields).eq("id", A).select("id");

describe("profile fields", () => {
  it("accept values up to the limit", async () => {
    const { data, error } = await updateProfile({
      name: text(80), university: text(120), bio: text(2000),
      interests: Array(20).fill(text(25)), looking_for: Array(20).fill(text(25)),
      github: `https://${text(292)}`,
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("refuse anything longer", async () => {
    expectRefused(await updateProfile({ name: text(81) }));
    expectRefused(await updateProfile({ name: text(1024 * 1024) }));
    expectRefused(await updateProfile({ university: text(121) }));
    expectRefused(await updateProfile({ bio: text(2001) }));
    expectRefused(await updateProfile({ interests: Array(21).fill("ai") }));
    expectRefused(await updateProfile({ interests: [text(501)] }));
    expectRefused(await updateProfile({ looking_for: [text(501)] }));
    expectRefused(await updateProfile({ skills: [text(1001)] }));
    expectRefused(await updateProfile({ github: `https://${text(300)}` }));
    expectRefused(await updateProfile({ avatar_url: text(501) }));
  });
});

describe("other tables", () => {
  it("refuse oversized links, roles, organizers and descriptions", async () => {
    expectRefused(await userA.from("projects").insert({ user_id: A, title: "Limits", url: `https://${text(1000)}` }));
    expectRefused(await userA.from("projects").insert({ user_id: A, title: "Limits", skills: [text(1001)] }));
    expectRefused(await userA.from("experiences").insert({ user_id: A, role: "r", company: "c", start_date: "2025-01-01", skills: [text(1001)] }));
    expectRefused(await userA.from("awards").update({ proof_url: `https://${text(1000)}` }).eq("id", awardId(1)));
    expectRefused(await userA.from("teams").insert({ owner_id: A, title: "Limits", roles: Array(10).fill(text(41)) }));
    expectRefused(await userA.from("opportunities").insert({ title: "Limits test", type: "other", url: "https://example.com/limits", deadline: "2030-01-01", organizer: text(121) }));
    expectRefused(await userA.from("ideas").insert({ author_id: A, title: "Limits", description: text(2001) }));
    // The team form's largest: 10 roles of 40 characters
    const { data: team, error } = await userA.from("teams").insert({ owner_id: A, title: "Limits", roles: Array.from({ length: 10 }, (_, i) => `${i}${text(39)}`) }).select("id").single();
    expect(error).toBeNull();
    await service.from("teams").delete().eq("id", team?.id).neq("id", teamId(1));
  });
});

describe("new accounts", () => {
  it("a guest can't give themselves a name through sign-up metadata", async () => {
    const { data } = await signedOut().auth.signInAnonymously({ options: { data: { name: "Fake Recruiter" } } });
    created.push(data.user?.id ?? "");
    const { data: profile } = await service.from("profiles").select("name").eq("id", data.user?.id ?? "").single();
    expect(profile?.name).toBe("");
  });

  it("a member with a very long name still signs up, with the name cut to the limit", async () => {
    const { data, error } = await signedOut().auth.signUp({ email: `limits-${crypto.randomUUID()}@schub.test`, password: "password123", options: { data: { name: text(500) } } });
    expect(error).toBeNull();
    created.push(data.user?.id ?? "");
    const { data: profile } = await service.from("profiles").select("name").eq("id", data.user?.id ?? "").single();
    expect(profile?.name).toBe(text(80));
  });
});
