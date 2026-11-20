import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HOURS, knownLanguages, LANGUAGES, oneOf, suitedModes, WORK_MODES, workStyleLine } from "./languages";

const sql = readFileSync(new URL("../../supabase/languages.sql", import.meta.url), "utf8");
const quoted = (text: string) => [...text.matchAll(/'([^']*)'/g)].map((m) => m[1]);

describe("knownLanguages", () => {
  it("keeps listed languages in their listed spelling, once each", () => {
    expect(knownLanguages(["korean", " English", "Klingon", "KOREAN"])).toEqual(["Korean", "English"]);
  });
});

describe("oneOf", () => {
  it("returns the value when it's in the list, else empty", () => {
    expect(oneOf(HOURS, "10-20")).toBe("10-20");
    expect(oneOf(HOURS, "100")).toBe("");
    expect(oneOf(WORK_MODES, null)).toBe("");
  });
});

describe("suitedModes", () => {
  it("counts Either as suiting both, and looking for Either as no filter", () => {
    expect(suitedModes("Remote")).toEqual(["Remote", "Either"]);
    expect(suitedModes("In person")).toEqual(["In person", "Either"]);
    expect(suitedModes("Either")).toEqual([]);
    expect(suitedModes("")).toEqual([]);
  });
});

describe("workStyleLine", () => {
  it("joins whatever is set", () => {
    expect(workStyleLine({ languages: ["Korean", "English"], hours_per_week: "10-20", work_mode: "Remote", city: " Seoul " })).toBe("Korean, English · 10-20 h/week · Remote · Seoul");
    expect(workStyleLine({ languages: [], hours_per_week: "", work_mode: "", city: "" })).toBe("");
    expect(workStyleLine({ languages: ["Korean"], hours_per_week: "", work_mode: "Either", city: "" })).toBe("Korean · In person or remote");
  });
});

describe("the database's lists (supabase/languages.sql)", () => {
  it("match the app's", () => {
    expect(quoted(sql.match(/languages <@ array\[([^\]]*)\]/)?.[1] ?? "")).toEqual(LANGUAGES);
    expect(quoted(sql.match(/hours_per_week in \(([^)]*)\)/)?.[1] ?? "")).toEqual(["", ...HOURS]);
    expect(quoted(sql.match(/profiles_work_mode_known check \(work_mode in \(([^)]*)\)/)?.[1] ?? "")).toEqual(["", ...WORK_MODES]);
    expect(quoted(sql.match(/teams_work_mode_known check \(work_mode in \(([^)]*)\)/)?.[1] ?? "")).toEqual(["", ...WORK_MODES]);
  });
});
