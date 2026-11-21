import { describe, expect, it } from "vitest";
import { memberSummary, teamMembers, teamRank, universitiesLabel, type Member, type TeamSummary } from "./teams";

const person = (id: string, university = ""): Member => ({ id, name: `Person ${id}`, avatar_url: "", university, open_to_collaborate: false });
const team = (over: Partial<TeamSummary> = {}): TeamSummary => ({
  id: "t",
  title: "T",
  roles: ["Backend", "Designer"],
  languages: [],
  work_mode: "",
  owner_id: "owner",
  owner: person("owner", "Korea University"),
  opportunity: null,
  team_applications: [],
  ...over,
});

describe("teamMembers", () => {
  it("is the owner and accepted members, never pending ones", () => {
    const t = team({
      team_applications: [
        { role: "Backend", status: "accepted", direction: "application", user_id: "a", person: person("a") },
        { role: "Designer", status: "pending", direction: "application", user_id: "b", person: person("b") },
      ],
    });
    expect(teamMembers(t).map((m) => m.id)).toEqual(["owner", "a"]);
  });
});

describe("memberSummary", () => {
  const members = [person("owner", "Korea University"), person("a", "KAIST"), person("b", "korea university ")];

  it("leads with the owner when none of your connections is on the team", () => {
    const s = memberSummary(members, new Set(["x"]));
    expect(s.lead?.id).toBe("owner");
    expect(s.connected).toBe(false);
    expect(s.others).toBe(2);
  });

  it("leads with your connection instead, and keeps everyone else after them", () => {
    const s = memberSummary(members, new Set(["b"]));
    expect(s.lead?.id).toBe("b");
    expect(s.connected).toBe(true);
    expect(s.ordered.map((m) => m.id)).toEqual(["b", "owner", "a"]);
  });

  it("lists each university once, whatever its case or spacing", () => {
    expect(memberSummary(members, new Set()).universities).toEqual(["korea university", "KAIST"]);
  });
});

describe("teamRank", () => {
  const event = { id: "e", title: "E", deadline: null, starts_at: null, ends_at: null };
  const withConnection = team({ team_applications: [{ role: "Backend", status: "accepted", direction: "application", user_id: "friend", person: person("friend") }] });

  it("puts events you're looking for a team on first, then teams with a connection, then the rest", () => {
    expect(teamRank(team({ opportunity: event }), new Set(["e"]), new Set())).toBe(0);
    expect(teamRank(withConnection, new Set(), new Set(["friend"]))).toBe(1);
    expect(teamRank(team(), new Set(), new Set(["friend"]))).toBe(2);
  });

  it("puts full teams last, even with a connection on them", () => {
    const full = team({ roles: ["Backend"], team_applications: withConnection.team_applications });
    expect(teamRank(full, new Set(), new Set(["friend"]))).toBe(3);
  });
});

describe("universitiesLabel", () => {
  it("names up to two, then the first and how many more", () => {
    expect(universitiesLabel([])).toBe("");
    expect(universitiesLabel(["KAIST"])).toBe("KAIST");
    expect(universitiesLabel(["KAIST", "Korea University"])).toBe("KAIST, Korea University");
    expect(universitiesLabel(["KAIST", "Korea University", "Seoul National University"])).toBe("KAIST + 2 more");
  });
});
