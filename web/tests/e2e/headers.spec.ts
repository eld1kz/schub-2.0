import { expect, test } from "@playwright/test";

// Security headers from next.config.ts, on pages and on the sign-in callback
test("every response carries the security headers and no X-Powered-By", async ({ request }) => {
  for (const path of ["/opportunities", "/people", "/u/00000000-0000-4000-8000-000000000001", "/auth/callback"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    const headers = res.headers();
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"], path).toContain("camera=()");
    expect(headers["strict-transport-security"], path).toContain("max-age=");
    expect(headers["x-powered-by"], path).toBeUndefined();
  }
});
