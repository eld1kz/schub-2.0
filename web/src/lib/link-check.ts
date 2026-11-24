// Checks that a link someone submitted opens, without letting them point the server at private addresses
// (cloud metadata, localhost, the internal network). Server only: it uses Node's http, https and dns.
import { lookup } from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";

const maxRedirects = 5;

// The public internet only: not loopback, private networks, link-local (cloud metadata), carrier-grade NAT,
// multicast or reserved ranges, in IPv4 or IPv6
export function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (version === 6) {
    const ip = address.toLowerCase();
    // IPv4 written as IPv6: ::ffff:10.0.0.1 or ::ffff:a00:1
    const dotted = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (dotted) return isPublicAddress(dotted[1]);
    const hex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const [high, low] = [parseInt(hex[1], 16), parseInt(hex[2], 16)];
      return isPublicAddress(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
    }
    return !(ip === "::" || ip === "::1" || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || ip.startsWith("ff") || ip.startsWith("64:ff9b:") || ip.startsWith("2001:db8:"));
  }
  return false;
}

// Resolves like the default lookup, but fails when any address is private. The request connects to the
// address checked here, so a name can't resolve to a public address for the check and a private one after.
export const safeLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { all: true }, (error, addresses) => {
    if (error) return callback(error, []);
    if (addresses.length === 0 || addresses.some((a) => !isPublicAddress(a.address))) {
      return callback(Object.assign(new Error(`${hostname} resolves to a private address`), { code: "EPRIVATE" }), []);
    }
    if (options.all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  });
};

type Hop = { status: number; location: string | null };
type Page = Hop & { contentType: string; body: string };

// The most of a page "Fill from link" reads: event details sit in the head
const maxPageBytes = 1_000_000;

// One request, no redirects followed: the status and where it points next. With `readBody`, a 200's body too
// (up to maxPageBytes), as text.
function request(url: URL, readBody: boolean): Promise<Page> {
  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      { method: "GET", lookup: safeLookup, timeout: 5000, headers: { "user-agent": "Mozilla/5.0 (Schub link check)", accept: "text/html" } },
      (response) => {
        const hop = { status: response.statusCode ?? 0, location: response.headers.location ?? null, contentType: response.headers["content-type"] ?? "" };
        if (!readBody || hop.status !== 200) {
          resolve({ ...hop, body: "" });
          response.destroy();
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        const done = () => resolve({ ...hop, body: Buffer.concat(chunks).toString("utf8") });
        response.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
          size += chunk.length;
          if (size >= maxPageBytes) {
            done();
            response.destroy();
          }
        });
        response.on("end", done);
        response.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("Timed out")));
    req.on("error", reject);
    req.end();
  });
}

const requestStatus = (url: URL): Promise<Hop> => request(url, false);
const requestPage = (url: URL): Promise<Page> => request(url, true);

// Only public websites: http(s), a dotted host name, never a raw IP address
function allowed(url: URL) {
  return /^https?:$/.test(url.protocol) && url.hostname.includes(".") && isIP(url.hostname.replace(/^\[|\]$/g, "")) === 0;
}

// Follows redirects one at a time, checking every hop again: the last answer, or null when a hop isn't allowed,
// fails, or there are too many
async function follow<T extends Hop>(url: string, send: (url: URL) => Promise<T>): Promise<T | null> {
  let current = URL.parse(url);
  for (let hop = 0; hop <= maxRedirects && current; hop++) {
    if (!allowed(current)) return null;
    let result: T;
    try {
      result = await send(current);
    } catch {
      return null;
    }
    if (result.status >= 300 && result.status < 400 && result.location) {
      current = URL.parse(result.location, current);
      continue;
    }
    return result;
  }
  return null;
}

// Rejects links that don't resolve, point somewhere private, or are gone (404/410). Sites that block bots
// (403, 429) still count as working, since a person can open them. `send` is only replaced in tests.
export async function linkWorks(url: string, send = requestStatus) {
  const result = await follow(url, send);
  return result !== null && result.status !== 404 && result.status !== 410;
}

// The HTML of a public page, with the same protections, or null when it doesn't open as HTML. For "Fill from link".
export async function fetchPage(url: string, send = requestPage) {
  const page = await follow(url, send);
  return page && page.status === 200 && /html/i.test(page.contentType) ? page.body : null;
}
