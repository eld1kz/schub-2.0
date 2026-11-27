// Languages and availability (supabase/languages.sql): profiles.languages, hours_per_week, work_mode, city
// and teams.languages, work_mode
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, B, expectNoChange, expectRefused, service, signInAs, signedOut, teamId, type Client } from "./helpers";

let userA: Client, userB: Client;
const extraTeams: string[] = [];
const workStyle = "languages, hours_per_week, work_mode, city";

beforeAll(async () => {
  [userA, userB] = await Promise.all([signInAs(1), signInAs(2)]);
});

afterAll(async () => {
  await service.from("profiles").update({ languages: ["Korean", "English"], hours_per_week: "10-20", work_mode: "Either", city: "Seoul" }).eq("id", A);
  for (const team of extraTeams) await service.from("teams").delete().eq("id", team);
});

describe("profiles", () => {
  it("everyone can read the work style, signed out too, but still not contact details", async () => {
    for (const client of [signedOut(), userB]) {
      const { data, error } = await client.from("profiles").select(workStyle).eq("id", A).single();
      expect(error).toBeNull();
      expect(data).toEqual({ languages: ["Korean", "English"], hours_per_week: "10-20", work_mode: "Either", city: "Seoul" });
      expectRefused(await client.from("profiles").select("languages, email").eq("id", A));
    }
  });

  it("you can set your own from the lists, and clear them", async () => {
    const set = { languages: ["Uzbek", "German"], hours_per_week: "20+", work_mode: "Remote", city: "Tashkent" };
    expect((await userA.from("profiles").update(set).eq("id", A)).error).toBeNull();
    expect((await service.from("profiles").select(workStyle).eq("id", A).single()).data).toEqual(set);
    const cleared = { languages: [], hours_per_week: "", work_mode: "", city: "" };
    expect((await userA.from("profiles").update(cleared).eq("id", A)).error).toBeNull();
    expect((await service.from("profiles").select(workStyle).eq("id", A).single()).data).toEqual(cleared);
  });

  it("only values from the lists, no repeats and a short city", async () => {
    await expectNoChange(["profiles"], async () => {
      expectRefused(await userA.from("profiles").update({ languages: ["Klingon"] }).eq("id", A));
      expectRefused(await userA.from("profiles").update({ languages: ["korean"] }).eq("id", A));
      expectRefused(await userA.from("profiles").update({ languages: Array(500).fill("Korean") }).eq("id", A));
      expectRefused(await userA.from("profiles").update({ languages: ["Korean", "Korean"] }).eq("id", A));
      expectRefused(await userA.from("profiles").update({ wanted_roles: ["Designer", "Designer"] }).eq("id", A));
      expectRefused(await userA.from("profiles").update({ hours_per_week: "40" }).eq("id", A));
      expectRefused(await userA.from("profiles").update({ work_mode: "Hybrid" }).eq("id", A));
      expectRefused(await userA.from("profiles").update({ city: "x".repeat(61) }).eq("id", A));
    });
  });

  it("nobody can change someone else's", async () => {
    await expectNoChange(["profiles"], async () => {
      await userA.from("profiles").update({ languages: ["German"], work_mode: "Remote", city: "Hacked" }).eq("id", B);
      await signedOut().from("profiles").update({ city: "Hacked" }).eq("id", B);
    });
  });
});

describe("teams", () => {
  const newTeam = (fields: Record<string, unknown>) =>
    userA.from("teams").insert({ owner_id: A, title: "Language test team", roles: ["Backend"], ...fields }).select("id").single();

  it("an owner can set the team's languages and work mode, and everyone can read them", async () => {
    const { data, error } = await newTeam({ languages: ["Korean", "Mongolian"], work_mode: "In person" });
    expect(error).toBeNull();
    extraTeams.push(data?.id);
    const { data: team } = await signedOut().from("teams").select("languages, work_mode").eq("id", data?.id).single();
    expect(team).toEqual({ languages: ["Korean", "Mongolian"], work_mode: "In person" });
  });

  it("only values from the lists", async () => {
    await expectNoChange(["teams"], async () => {
      expectRefused(await newTeam({ languages: ["Elvish"] }));
      expectRefused(await newTeam({ languages: Array(100).fill("English") }));
      expectRefused(await newTeam({ languages: ["English", "English"] }));
      expectRefused(await newTeam({ work_mode: "Sometimes" }));
    });
  });

  it("nobody but the owner can change a team's languages or work mode", async () => {
    await expectNoChange(["teams"], async () => {
      await userB.from("teams").update({ languages: ["German"] }).eq("id", teamId(1));
      await userB.from("teams").update({ work_mode: "Remote" }).eq("id", teamId(1));
    });
  });
});
