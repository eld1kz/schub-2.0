import { describe, expect, it } from "vitest";
import { enabledMethods, lastUsedFirst, sessionMethod } from "./auth-providers";

describe("enabledMethods", () => {
  it("keeps the button order, whatever order the list is in", () => {
    expect(enabledMethods("email, GitHub,google")).toEqual(["google", "github", "email"]);
  });

  it("ignores names it doesn't know and empty entries", () => {
    expect(enabledMethods("google,,twitter")).toEqual(["google"]);
    expect(enabledMethods("")).toEqual([]);
  });
});

describe("sessionMethod", () => {
  const google = { provider: "google", last_sign_in_at: "2026-11-01T00:00:00Z" };
  const github = { provider: "github", last_sign_in_at: "2026-11-10T00:00:00Z" };
  const email = { provider: "email", last_sign_in_at: "2026-11-20T00:00:00Z" };

  it("reads an email link from the session", () => {
    expect(sessionMethod([{ method: "magiclink", timestamp: 1 }], [email])).toBe("email");
    expect(sessionMethod([{ method: "email/signup", timestamp: 1 }], [email])).toBe("email");
  });

  it("takes the provider signed in most recently for OAuth, never the email identity", () => {
    expect(sessionMethod([{ method: "oauth", timestamp: 1 }], [google, github, email])).toBe("github");
    expect(sessionMethod([{ method: "oauth", timestamp: 1 }], [google])).toBe("google");
  });

  it("uses the newest amr entry", () => {
    expect(sessionMethod([{ method: "oauth", timestamp: 1 }, { method: "magiclink", timestamp: 2 }], [google])).toBe("email");
  });

  it("names nothing for other methods or unknown providers", () => {
    expect(sessionMethod([{ method: "password", timestamp: 1 }], [email])).toBeNull();
    expect(sessionMethod([{ method: "oauth", timestamp: 1 }], [{ provider: "twitter" }])).toBeNull();
    expect(sessionMethod(undefined, [])).toBeNull();
  });
});

describe("lastUsedFirst", () => {
  it("moves the last-used method to the top", () => {
    expect(lastUsedFirst(["google", "github", "email"], "email")).toEqual({ lastUsed: "email", ordered: ["email", "google", "github"] });
  });

  it("ignores a method that's turned off, or a cookie it doesn't know", () => {
    expect(lastUsedFirst(["google", "email"], "github")).toEqual({ lastUsed: null, ordered: ["google", "email"] });
    expect(lastUsedFirst(["google"], "x@y.z")).toEqual({ lastUsed: null, ordered: ["google"] });
    expect(lastUsedFirst(["google"], undefined)).toEqual({ lastUsed: null, ordered: ["google"] });
  });
});
