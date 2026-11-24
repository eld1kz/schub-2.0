import { describe, expect, it } from "vitest";
import { currentEntry, memberSummary, recruitingRoles, teamMembers, teamRank, universitiesLabel, withCurrentEvent, type Entry, type Member, type TeamSummary } from "./teams";

const person = (id: string, university = ""): Member => ({ id, name: `Person ${id}`, avatar_url: "", university, open_to_collaborate: false });
const team = (over: Partial<TeamSummary> = {}): TeamSummary => ({
  id: "t",
  title: "T",
  roles: ["Backend", "Designer"],
  languages: [],
  work_mode: "",
  owner_id: "owner",
  owner: person("owner", "Korea University"),
  team_entries: [],
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

const day = "2026-11-24";
const event = (id: string, dates: Partial<Pick<NonNullable<Entry["opportunity"]>, "deadline" | "starts_at" | "ends_at">> = {}) =>
  ({ id, title: id.toUpperCase(), url: "", deadline: null, starts_at: null, ends_at: null, ...dates });
const entry = (o: Entry["opportunity"], created_at = "2026-01-01"): Entry => ({ status: "going", created_at, opportunity: o });

describe("currentEntry", () => {
  const past = entry(event("past", { starts_at: "2026-10-01", ends_at: "2026-10-02" }));
  const later = entry(event("later", { deadline: "2027-02-01" }));
  const sooner = entry(event("sooner", { starts_at: "2026-12-05", ends_at: "2026-12-06" }));

  it("is the soonest upcoming entry, whatever order they were entered in", () => {
    expect(currentEntry([past, later, sooner], day)?.opportunity?.id).toBe("sooner");
  });

  it("falls back to the event that ended last, and is null with no entries", () => {
    const earlier = entry(event("earlier", { ends_at: "2026-03-01" }));
    expect(currentEntry([earlier, past], day)?.opportunity?.id).toBe("past");
    expect(currentEntry([], day)).toBeNull();
  });

  it("skips events that can't be read, and counts one with no dates as upcoming", () => {
    expect(currentEntry([entry(null), past, entry(event("undated"))], day)?.opportunity?.id).toBe("undated");
  });

  it("a running event (started, not yet over) is still current", () => {
    const running = entry(event("running", { starts_at: "2026-11-20", ends_at: "2026-11-30" }));
    expect(currentEntry([later, running], day)?.opportunity?.id).toBe("running");
  });
});

describe("recruitingRoles", () => {
  const ended = event("ended", { ends_at: "2026-11-01" });
  const coming = event("coming", { starts_at: "2027-01-10" });

  it("lists open roles while the current event is ahead, and none once it's over", () => {
    expect(recruitingRoles(withCurrentEvent(team({ team_entries: [entry(coming)] }), day), day)).toEqual(["Backend", "Designer"]);
    expect(recruitingRoles(withCurrentEvent(team({ team_entries: [entry(ended)] }), day), day)).toEqual([]);
  });

  it("a team without an event keeps recruiting", () => {
    expect(recruitingRoles(team(), day)).toEqual(["Backend", "Designer"]);
  });

  it("on an event's page, goes by that event: none for an ended one, even with another event ahead", () => {
    const both = withCurrentEvent(team({ team_entries: [entry(ended), entry(coming)] }), day);
    expect(recruitingRoles(both, day)).toEqual(["Backend", "Designer"]);
    expect(recruitingRoles(both, day, "ended")).toEqual([]);
    expect(recruitingRoles(both, day, "coming")).toEqual(["Backend", "Designer"]);
  });
});

describe("teamRank", () => {
  const withConnection = team({ team_applications: [{ role: "Backend", status: "accepted", direction: "application", user_id: "friend", person: person("friend") }] });

  it("puts events you're looking for a team on first, then teams with a connection, then the rest", () => {
    expect(teamRank(team({ opportunity: event("e") }), new Set(["e"]), new Set(), day)).toBe(0);
    expect(teamRank(withConnection, new Set(), new Set(["friend"]), day)).toBe(1);
    expect(teamRank(team(), new Set(), new Set(["friend"]), day)).toBe(2);
  });

  it("puts full teams last, even with a connection on them", () => {
    const full = team({ roles: ["Backend"], team_applications: withConnection.team_applications });
    expect(teamRank(full, new Set(), new Set(["friend"]), day)).toBe(3);
  });

  it("puts a team whose event is over with the full ones", () => {
    const over = withCurrentEvent(team({ team_entries: [entry(event("e", { ends_at: "2026-11-01" }))] }), day);
    expect(teamRank(over, new Set(["e"]), new Set(), day)).toBe(3);
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
