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

// One request, no redirects followed: the status and where it points next
function requestStatus(url: URL): Promise<Hop> {
  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const request = client.request(
      url,
      { method: "GET", lookup: safeLookup, timeout: 5000, headers: { "user-agent": "Mozilla/5.0 (Schub link check)" } },
      (response) => {
        resolve({ status: response.statusCode ?? 0, location: response.headers.location ?? null });
        response.destroy();
      },
    );
    request.on("timeout", () => request.destroy(new Error("Timed out")));
    request.on("error", reject);
    request.end();
  });
}

// Only public websites: http(s), a dotted host name, never a raw IP address
function allowed(url: URL) {
  return /^https?:$/.test(url.protocol) && url.hostname.includes(".") && isIP(url.hostname.replace(/^\[|\]$/g, "")) === 0;
}

// Rejects links that don't resolve, point somewhere private, or are gone (404/410). Sites that block bots
// (403, 429) still count as working, since a person can open them. Redirects are followed one at a time and
// every hop is checked again. `request` is only replaced in tests.
export async function linkWorks(url: string, request = requestStatus) {
  let current = URL.parse(url);
  for (let hop = 0; hop <= maxRedirects && current; hop++) {
    if (!allowed(current)) return false;
    let result: Hop;
    try {
      result = await request(current);
    } catch {
      return false;
    }
    if (result.status >= 300 && result.status < 400 && result.location) {
      current = URL.parse(result.location, current);
      continue;
    }
    return result.status !== 404 && result.status !== 410;
  }
  return false;
}
