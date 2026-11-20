// Open to a team (supabase/open-to-team.sql): profiles.wanted_roles and teams.role_notes
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, B, expectNoChange, expectRefused, service, signInAs, signedOut, teamId, type Client } from "./helpers";

let userA: Client, userB: Client;
const extraTeams: string[] = [];

beforeAll(async () => {
  [userA, userB] = await Promise.all([signInAs(1), signInAs(2)]);
});

afterAll(async () => {
  await service.from("profiles").update({ wanted_roles: [], open_to_collaborate: true }).eq("id", A);
  for (const team of extraTeams) await service.from("teams").delete().eq("id", team);
});

describe("wanted_roles", () => {
  it("everyone can read it, signed out too, and contact details stay private", async () => {
    await service.from("profiles").update({ wanted_roles: ["Designer"] }).eq("id", A);
    for (const client of [signedOut(), userB]) {
      const { data, error } = await client.from("profiles").select("wanted_roles, open_to_collaborate").eq("id", A).single();
      expect(error).toBeNull();
      expect(data).toEqual({ wanted_roles: ["Designer"], open_to_collaborate: true });
      expectRefused(await client.from("profiles").select("wanted_roles, telegram").eq("id", A));
    }
  });

  it("you can set your own to roles from the list and switch being open off and on", async () => {
    const { error } = await userA.from("profiles").update({ wanted_roles: ["Frontend", "ML / AI"], open_to_collaborate: false }).eq("id", A);
    expect(error).toBeNull();
    const { data } = await service.from("profiles").select("wanted_roles, open_to_collaborate").eq("id", A).single();
    expect(data).toEqual({ wanted_roles: ["Frontend", "ML / AI"], open_to_collaborate: false });
  });

  it("only roles from the list are accepted", async () => {
    await expectNoChange(["profiles"], async () => {
      expectRefused(await userA.from("profiles").update({ wanted_roles: ["Frontend", "CTO"] }).eq("id", A));
      expectRefused(await userA.from("profiles").update({ wanted_roles: ["frontend"] }).eq("id", A));
      expectRefused(await userA.from("profiles").update({ wanted_roles: ["x".repeat(5000)] }).eq("id", A));
      // Repeats of a listed role, which containment alone would let through
      expectRefused(await userA.from("profiles").update({ wanted_roles: Array(1000).fill("Designer") }).eq("id", A));
    });
  });

  it("nobody can change someone else's", async () => {
    await expectNoChange(["profiles"], async () => {
      await userA.from("profiles").update({ wanted_roles: ["Designer"], open_to_collaborate: false }).eq("id", B);
      await signedOut().from("profiles").update({ wanted_roles: ["Designer"] }).eq("id", B);
    });
  });
});

describe("teams.role_notes", () => {
  const newTeam = (role_notes: unknown, roles = ["Designer", "Backend"]) =>
    userA.from("teams").insert({ owner_id: A, title: "Notes test team", roles, role_notes }).select("id").single();

  it("an owner can add a note to any of the team's roles", async () => {
    const { data, error } = await newTeam({ Designer: "Figma, mobile first" });
    expect(error).toBeNull();
    extraTeams.push(data?.id);
    const { data: team } = await signedOut().from("teams").select("role_notes").eq("id", data?.id).single();
    expect(team?.role_notes).toEqual({ Designer: "Figma, mobile first" });
  });

  it("refuses notes for roles the team doesn't have, notes that aren't text, long notes and anything but an object", async () => {
    await expectNoChange(["teams"], async () => {
      expectRefused(await newTeam({ Frontend: "not a role here" }));
      expectRefused(await newTeam({ Designer: 5 }));
      expectRefused(await newTeam({ Designer: { nested: "x" } }));
      expectRefused(await newTeam({ Designer: "x".repeat(81) }));
      expectRefused(await newTeam(["Designer"]));
      expectRefused(await newTeam("Designer"));
    });
  });

  it("nobody can change a team's notes afterwards, not even its owner", async () => {
    await expectNoChange(["teams"], async () => {
      await userA.from("teams").update({ role_notes: {} }).eq("id", teamId(1));
      await userB.from("teams").update({ role_notes: { Backend: "hacked" } }).eq("id", teamId(1));
    });
  });
});
