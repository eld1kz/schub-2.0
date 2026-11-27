import { describe, expect, it } from "vitest";
import { teamSlots } from "./teams";

describe("teamSlots", () => {
  it("lists the owner, then each role in order, filled by whoever was accepted for it", () => {
    const slots = teamSlots({
      roles: ["Backend", "Designer"],
      owner: "Minji",
      team_applications: [
        { role: "Designer", status: "accepted", person: "Minho" },
        { role: "Backend", status: "pending", person: "Ara" },
        // Their role was typed in once and isn't listed any more
        { role: "Pitch", status: "accepted", person: "Kai" },
      ],
    });
    expect(slots.map((s) => [s.role, s.filled, s.person])).toEqual([
      ["Lead", true, "Minji"],
      ["Backend", false, null],
      ["Designer", true, "Minho"],
      ["Pitch", true, "Kai"],
    ]);
    expect(new Set(slots.map((s) => s.id)).size).toBe(slots.length);
  });

  it("keeps a slot's id when it's filled, so the page can animate it", () => {
    const team = { roles: ["Backend"], owner: "Minji" };
    const open = teamSlots({ ...team, team_applications: [] });
    const filled = teamSlots({ ...team, team_applications: [{ role: "Backend", status: "accepted", person: "Ara" }] });
    expect(filled[1].id).toBe(open[1].id);
  });
});
