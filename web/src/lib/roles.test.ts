import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { knownRoles, ROLE_NOTE_MAX, ROLES, rolesWithNotes } from "./roles";

describe("knownRoles", () => {
  it("keeps listed roles in their listed spelling, once each, and drops the rest", () => {
    expect(knownRoles(["frontend", " Designer ", "CTO", "FRONTEND", "ml / ai"])).toEqual(["Frontend", "Designer", "ML / AI"]);
    expect(knownRoles([])).toEqual([]);
  });

  it("accepts every role in the list", () => {
    expect(knownRoles(ROLES)).toEqual(ROLES);
  });
});

describe("rolesWithNotes", () => {
  it("pairs each role with the note at the same position, leaving out empty notes", () => {
    expect(rolesWithNotes(["Designer", "Backend"], ["Figma, mobile first", "  "])).toEqual({
      roles: ["Designer", "Backend"],
      notes: { Designer: "Figma, mobile first" },
    });
  });

  it("drops unknown and repeated roles together with their notes", () => {
    expect(rolesWithNotes(["Wizard", "Data", "data"], ["magic", "SQL", "again"])).toEqual({ roles: ["Data"], notes: { Data: "SQL" } });
  });

  it("cuts long notes and copes with missing ones", () => {
    const { notes } = rolesWithNotes(["iOS", "Android"], ["x".repeat(200)]);
    expect(notes).toEqual({ iOS: "x".repeat(ROLE_NOTE_MAX) });
  });
});

describe("ROLES", () => {
  it("matches the list the database accepts (supabase/open-to-team.sql)", () => {
    const sql = readFileSync(new URL("../../supabase/open-to-team.sql", import.meta.url), "utf8");
    const listed = sql.match(/wanted_roles <@ array\[([^\]]*)\]/)?.[1] ?? "";
    expect([...listed.matchAll(/'([^']*)'/g)].map((m) => m[1])).toEqual(ROLES);
  });
});
