import { describe, expect, it } from "vitest";
import { goingLabel, tallyGoing } from "./connections";

describe("tallyGoing", () => {
  const connections = new Set(["a", "b"]);

  it("counts each connection once per opportunity, whether looking or on a team", () => {
    const going = tallyGoing(
      [{ opportunity_id: "o1", user_id: "a" }, { opportunity_id: "o1", user_id: "stranger" }],
      [{ opportunity_id: "o1", user_id: "a" }, { opportunity_id: "o1", user_id: "b" }],
      connections,
    );
    expect(going.get("o1")?.people.size).toBe(2);
    expect(going.get("o1")?.onTeam).toBe(true);
  });

  it("says when they're only looking, and leaves out opportunities with none of them", () => {
    const going = tallyGoing([{ opportunity_id: "o2", user_id: "b" }, { opportunity_id: "o3", user_id: "stranger" }], [], connections);
    expect(going.get("o2")?.onTeam).toBe(false);
    expect(going.has("o3")).toBe(false);
  });
});

describe("goingLabel", () => {
  it("agrees with the count", () => {
    expect(goingLabel(1)).toBe("1 of your connections is going");
    expect(goingLabel(2)).toBe("2 of your connections are going");
  });
});
