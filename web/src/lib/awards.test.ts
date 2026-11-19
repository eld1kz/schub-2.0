import { describe, expect, it } from "vitest";
import { byRank, placementLabel, PLACEMENTS, type Award } from "./awards";

const award = (id: string, placement: string, awarded_on: string) => ({ id, placement, awarded_on }) as Award;

describe("byRank", () => {
  it("puts the best placement first", () => {
    const sorted = [
      award("finalist", "Finalist", "2026-01-01"),
      award("mention", "Honorable mention", "2026-01-01"),
      award("winner", "Winner", "2020-01-01"),
      award("special", "Special prize", "2026-01-01"),
      award("track", "Track winner", "2026-01-01"),
      award("third", "3rd", "2026-01-01"),
      award("first", "1st", "2026-01-01"),
    ].sort(byRank);
    expect(sorted.map((a) => a.id)).toEqual(["winner", "first", "third", "track", "special", "finalist", "mention"]);
  });

  it("ranks track winners and special prizes above finalists", () => {
    expect(PLACEMENTS.indexOf("Track winner")).toBeLessThan(PLACEMENTS.indexOf("Finalist"));
    expect(PLACEMENTS.indexOf("Special prize")).toBeLessThan(PLACEMENTS.indexOf("Finalist"));
  });

  it("breaks ties with the most recent first", () => {
    const sorted = [award("old", "2nd", "2024-05-01"), award("new", "2nd", "2026-02-01")].sort(byRank);
    expect(sorted.map((a) => a.id)).toEqual(["new", "old"]);
  });
});

describe("placementLabel", () => {
  it("reads 1st to 3rd as places and leaves the rest alone", () => {
    expect(placementLabel("1st")).toBe("1st place");
    expect(placementLabel("3rd")).toBe("3rd place");
    expect(placementLabel("Winner")).toBe("Winner");
  });
});
