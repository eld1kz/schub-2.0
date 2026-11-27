import { afterEach, describe, expect, it, vi } from "vitest";
import { beforeSend, scrubEvent, sentryOptions } from "./sentry";

describe("scrubEvent", () => {
  it("keeps only the user id, and no cookies, headers, body, query strings, breadcrumbs or extras", () => {
    const event = scrubEvent({
      type: undefined,
      user: { id: "u1", email: "a@b.test", username: "ann", ip_address: "1.2.3.4" },
      request: { url: "https://schub.test/login?next=/u/1#x", method: "POST", headers: { cookie: "t" }, cookies: { t: "t" }, data: "telegram=@ann", query_string: "next=/u/1" },
      contexts: { nextjs: { request_path: "/auth/callback?code=secret" } },
      breadcrumbs: [{ message: "clicked Ann" }],
      extra: { email: "a@b.test" },
    });
    expect(event.user).toEqual({ id: "u1" });
    expect(event.request).toEqual({ url: "https://schub.test/login", method: "POST" });
    expect(event.contexts?.nextjs?.request_path).toBe("/auth/callback");
    expect(event).not.toHaveProperty("breadcrumbs");
    expect(event).not.toHaveProperty("extra");
  });

  it("drops a user without an id", () => {
    expect(scrubEvent({ type: undefined, user: { email: "a@b.test" } }).user).toEqual({});
  });

  it("removes email addresses from error messages", () => {
    const event = scrubEvent({
      type: undefined,
      message: "for ann.lee+x@mail.example.kr",
      exception: { values: [{ value: "Key (email)=(ann@b.test) already exists, ann%40b.test" }] },
    });
    expect(event.message).toBe("for [email]");
    expect(event.exception?.values?.[0].value).toBe("Key (email)=([email]) already exists, [email]");
  });
});

describe("beforeSend", () => {
  afterEach(() => vi.unstubAllGlobals());
  const serverError = Object.assign(new Error("Server Components render"), { digest: "123" });

  it("in the browser, skips errors the server already reported", () => {
    vi.stubGlobal("window", {});
    expect(beforeSend({ type: undefined }, { originalException: serverError })).toBeNull();
    expect(beforeSend({ type: undefined }, { originalException: new Error("click") })).not.toBeNull();
  });

  it("sends them from the server", () => {
    expect(beforeSend({ type: undefined }, { originalException: serverError })).not.toBeNull();
  });
});

describe("sentryOptions", () => {
  it("collects no personal data and traces nothing", () => {
    expect(sentryOptions.dataCollection).toMatchObject({ userInfo: false, cookies: false, httpHeaders: false, httpBodies: [] });
    expect(sentryOptions).not.toHaveProperty("tracesSampleRate");
  });
});
