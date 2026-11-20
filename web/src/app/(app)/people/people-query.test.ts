import { describe, expect, it } from "vitest";
import { peopleHref, readPeopleQuery } from "./people-query";

describe("readPeopleQuery", () => {
  it("keeps only known skills and roles, and a whole page number of at least 1", () => {
    expect(readPeopleQuery({ skills: "react,Cooking,Go", open: "1", role: "designer", page: "2.7" })).toEqual({
      skills: ["React", "Go"],
      open: true,
      role: "Designer",
      page: 2,
    });
    expect(readPeopleQuery({ role: "Wizard", page: "-3", open: "yes" })).toEqual({ skills: [], open: false, role: "", page: 1 });
  });
});

describe("peopleHref", () => {
  it("writes only the filters that are set", () => {
    expect(peopleHref({ skills: [], open: false, role: "", page: 1 })).toBe("/people");
    expect(peopleHref({ skills: ["React", "C++"], open: true, role: "ML / AI", page: 3 })).toBe("/people?skills=React,C%2B%2B&open=1&role=ML%20%2F%20AI&page=3");
  });

  it("reads back what it writes", () => {
    const query = { skills: ["Go"], open: true, role: "Product / PM", page: 2 };
    const params = Object.fromEntries(new URL(peopleHref(query), "http://x").searchParams);
    expect(readPeopleQuery(params)).toEqual(query);
  });
});
