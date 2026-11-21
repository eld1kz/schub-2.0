import { describe, expect, it } from "vitest";
import { builtWith, type SharedProject } from "./shared-projects";

const person = (id: string) => ({ id, name: `Person ${id}`, avatar_url: "" });
const project = (members: SharedProject["team_project_members"]): SharedProject => ({
  id: "p",
  team_id: "t",
  title: "Built it",
  pitch: "",
  image_url: "",
  url: "",
  repo_url: "",
  result: "",
  team: { id: "t", title: "Team", owner_id: "owner", opportunity_id: null },
  team_project_members: members,
});

describe("builtWith", () => {
  it("lists everyone who confirmed, the owner first, leaving out the profile it's on", () => {
    const p = project([
      { user_id: "a", status: "confirmed", hidden: false, person: person("a") },
      { user_id: "owner", status: "confirmed", hidden: false, person: person("owner") },
      { user_id: "b", status: "pending", hidden: false, person: person("b") },
      { user_id: "c", status: "declined", hidden: false, person: person("c") },
      { user_id: "d", status: "confirmed", hidden: true, person: person("d") },
    ]);
    expect(builtWith(p).map((x) => x.id)).toEqual(["owner", "a", "d"]);
    expect(builtWith(p, "a").map((x) => x.id)).toEqual(["owner", "d"]);
  });
});
