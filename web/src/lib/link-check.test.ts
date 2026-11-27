import { describe, expect, it, vi } from "vitest";

// Fake DNS: no network in these tests
const records: Record<string, string[]> = {
  "public.example": ["93.184.216.34"],
  "other.example": ["93.184.216.35"],
  "internal.example": ["10.0.0.5"],
  "metadata.example": ["169.254.169.254"],
  "mixed.example": ["93.184.216.34", "127.0.0.1"],
  "mapped.example": ["::ffff:127.0.0.1"],
};
vi.mock("node:dns", () => ({
  lookup: (host: string, _options: unknown, callback: (error: Error | null, addresses: { address: string; family: number }[]) => void) => {
    const found = records[host];
    if (!found) return callback(Object.assign(new Error("not found"), { code: "ENOTFOUND" }), []);
    callback(null, found.map((address) => ({ address, family: address.includes(":") ? 6 : 4 })));
  },
}));

const { fetchPage, isPublicAddress, linkWorks, safeLookup } = await import("./link-check");

type Hop = { status: number; location: string | null };
// A fake network: each URL answers with the given status and Location
function fakeRequest(answers: Record<string, Hop>) {
  return vi.fn(async (url: URL) => answers[url.href] ?? { status: 200, location: null });
}

describe("isPublicAddress", () => {
  it("refuses loopback, private, link-local, CGNAT, multicast and reserved addresses", () => {
    for (const ip of [
      "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1",
      "0.0.0.0", "224.0.0.1", "255.255.255.255", "192.0.0.1", "198.18.0.1",
      "::1", "::", "fc00::1", "fd12::1", "fe80::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:a9fe:a9fe", "64:ff9b::a00:1",
      "not an ip",
    ]) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
  });

  it("accepts public addresses", () => {
    for (const ip of ["93.184.216.34", "8.8.8.8", "172.32.0.1", "100.128.0.1", "2606:4700::1111", "::ffff:8.8.8.8"]) {
      expect(isPublicAddress(ip), ip).toBe(true);
    }
  });
});

describe("safeLookup", () => {
  const resolve = (host: string) =>
    new Promise<string>((done, fail) => safeLookup(host, {}, (error, address) => (error ? fail(error) : done(String(address)))));

  it("resolves public names", async () => {
    await expect(resolve("public.example")).resolves.toBe("93.184.216.34");
  });

  it("fails when any address is private", async () => {
    for (const host of ["internal.example", "metadata.example", "mixed.example", "mapped.example"]) {
      await expect(resolve(host), host).rejects.toThrow("private address");
    }
  });
});

describe("linkWorks", () => {
  it("never connects to a name that resolves to a private address (real request, fake DNS)", async () => {
    expect(await linkWorks("http://internal.example/")).toBe(false);
    expect(await linkWorks("https://metadata.example/latest/meta-data/")).toBe(false);
  });

  it("refuses raw IPs, bare host names and other schemes without making a request", async () => {
    const request = fakeRequest({});
    for (const url of ["http://127.0.0.1/", "http://[::1]/", "http://0x7f.1/", "http://2130706433/", "http://localhost/", "ftp://public.example/", "not a url"]) {
      expect(await linkWorks(url, request), url).toBe(false);
    }
    expect(request).not.toHaveBeenCalled();
  });

  it("checks every redirect hop, and stops before a private one", async () => {
    const request = fakeRequest({ "https://public.example/go": { status: 302, location: "http://169.254.169.254/latest/meta-data/" } });
    expect(await linkWorks("https://public.example/go", request)).toBe(false);
    expect(request).toHaveBeenCalledTimes(1);

    const toLocalhost = fakeRequest({ "https://public.example/go": { status: 301, location: "http://localhost:8080/admin" } });
    expect(await linkWorks("https://public.example/go", toLocalhost)).toBe(false);
    expect(toLocalhost).toHaveBeenCalledTimes(1);
  });

  it("follows public redirects, relative ones too", async () => {
    const request = fakeRequest({
      "https://public.example/a": { status: 301, location: "/b" },
      "https://public.example/b": { status: 302, location: "https://other.example/c" },
    });
    expect(await linkWorks("https://public.example/a", request)).toBe(true);
    expect(request.mock.calls.map(([url]) => url.href)).toEqual(["https://public.example/a", "https://public.example/b", "https://other.example/c"]);
  });

  it("gives up after 5 redirects", async () => {
    const request = vi.fn(async (url: URL) => ({ status: 302, location: `${url.href}x` }));
    expect(await linkWorks("https://public.example/", request)).toBe(false);
    expect(request).toHaveBeenCalledTimes(6);
  });

  it("treats 404 and 410 as broken, and bot blocks as working", async () => {
    expect(await linkWorks("https://public.example/", fakeRequest({ "https://public.example/": { status: 404, location: null } }))).toBe(false);
    expect(await linkWorks("https://public.example/", fakeRequest({ "https://public.example/": { status: 410, location: null } }))).toBe(false);
    expect(await linkWorks("https://public.example/", fakeRequest({ "https://public.example/": { status: 403, location: null } }))).toBe(true);
    expect(await linkWorks("https://public.example/", vi.fn(async () => Promise.reject(new Error("refused"))))).toBe(false);
  });
});

describe("fetchPage", () => {
  type Page = Hop & { contentType: string; body: string };
  const page = (answers: Record<string, Partial<Page>>) =>
    vi.fn(async (url: URL): Promise<Page> => ({ status: 200, location: null, contentType: "text/html; charset=utf-8", body: "<html></html>", ...answers[url.href] }));

  it("returns a public page's HTML, after redirects", async () => {
    const send = page({ "https://public.example/a": { status: 301, location: "/b" }, "https://public.example/b": { body: "<title>Hi</title>" } });
    expect(await fetchPage("https://public.example/a", send)).toBe("<title>Hi</title>");
  });

  it("refuses private addresses and redirects to them, like linkWorks", async () => {
    expect(await fetchPage("http://internal.example/")).toBeNull();
    const send = page({ "https://public.example/a": { status: 302, location: "http://127.0.0.1/admin" } });
    expect(await fetchPage("https://public.example/a", send)).toBeNull();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("returns nothing for errors and anything that isn't HTML", async () => {
    expect(await fetchPage("https://public.example/", page({ "https://public.example/": { status: 404 } }))).toBeNull();
    expect(await fetchPage("https://public.example/", page({ "https://public.example/": { contentType: "application/pdf" } }))).toBeNull();
  });
});
