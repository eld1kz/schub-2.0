// Editing a team (supabase/team-edit.sql)
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, B, expectNoChange, expectRefused, id, service, signInAs, signedOut, type Client } from "./helpers";

let owner: Client, userB: Client, member: Client;
let team = "";

beforeAll(async () => {
  [owner, userB, member] = await Promise.all([signInAs(1), signInAs(2), signInAs(3)]);
  const { data, error } = await service.from("teams").insert({ owner_id: A, title: "Edit test team", roles: ["Backend", "Designer", "Data"] }).select("id").single();
  if (error) throw error;
  team = data.id;
  const rows = [
    { team_id: team, user_id: B, role: "Designer", status: "pending", direction: "application" },
    { team_id: team, user_id: id(4), role: "Designer", status: "pending", direction: "invite" },
    { team_id: team, user_id: id(3), role: "Backend", status: "accepted", direction: "application" },
    { team_id: team, user_id: id(5), role: "Data", status: "pending", direction: "application" },
  ];
  const added = await service.from("team_applications").insert(rows);
  if (added.error) throw added.error;
  await service.from("notifications").delete().in("user_id", [A, B, id(4), id(5)]);
});

afterAll(async () => {
  await service.from("teams").delete().eq("id", team);
  await service.from("notifications").delete().eq("link", `/teams/${team}`);
});

describe("editing a team", () => {
  it("the owner changes the title, description, languages and work mode", async () => {
    const fields = { title: "Renamed", description: "New", languages: ["Korean"], work_mode: "Remote" };
    const { data } = await owner.from("teams").update(fields).eq("id", team).select("title, description, languages, work_mode");
    expect(data).toEqual([fields]);
  });

  it("nobody else can, and the owner can't give the team away", async () => {
    await expectNoChange(["teams"], async () => {
      await userB.from("teams").update({ title: "Hacked" }).eq("id", team);
      await member.from("teams").update({ description: "Hacked" }).eq("id", team);
      await signedOut().from("teams").update({ title: "Hacked" }).eq("id", team);
      expectRefused(await owner.from("teams").update({ owner_id: B }).eq("id", team));
      expectRefused(await owner.from("teams").update({ created_at: "2020-01-01" }).eq("id", team));
    });
  });

  it("removing a role declines its pending application and invite and tells only those people", async () => {
    expect((await owner.from("teams").update({ roles: ["Backend", "Data"] }).eq("id", team)).error).toBeNull();
    const { data: rows } = await service.from("team_applications").select("user_id, status").eq("team_id", team).order("user_id");
    expect(rows).toEqual([
      { user_id: B, status: "declined" },
      { user_id: id(3), status: "accepted" },
      { user_id: id(4), status: "declined" },
      { user_id: id(5), status: "pending" },
    ]);
    const { data: sent } = await service.from("notifications").select("user_id, type, message").in("user_id", [A, B, id(4), id(5)]).order("user_id");
    expect(sent).toEqual([
      { user_id: B, type: "team_role_removed", message: "Renamed no longer needs a Designer, so your application was declined" },
      { user_id: id(4), type: "team_role_removed", message: "Renamed no longer needs a Designer, so your invitation was declined" },
    ]);
  });

  it("an ordinary decline still notifies as before", async () => {
    await owner.from("team_applications").update({ status: "declined" }).eq("team_id", team).eq("user_id", id(5));
    const { data } = await service.from("notifications").select("type").eq("user_id", id(5));
    expect(data).toEqual([{ type: "application_declined" }]);
  });
});
