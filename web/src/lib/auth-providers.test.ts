import { describe, expect, it } from "vitest";
import { enabledMethods } from "./auth-providers";

describe("enabledMethods", () => {
  it("keeps the button order, whatever order the list is in", () => {
    expect(enabledMethods("email, GitHub,google")).toEqual(["google", "github", "email"]);
  });

  it("ignores names it doesn't know and empty entries", () => {
    expect(enabledMethods("google,,twitter")).toEqual(["google"]);
    expect(enabledMethods("")).toEqual([]);
  });
});
