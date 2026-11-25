// 6-digit authenticator codes (RFC 6238: HMAC-SHA1, 30-second steps) from a base32 secret, as an authenticator
// app makes them. Used by the database and browser tests to pass two-factor checks.
import { createHmac } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// The admin's authenticator in supabase/seed.local.sql
export const SEEDED_ADMIN_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
export const SEEDED_ADMIN_FACTOR = "00000000-0000-4000-c000-000000000020";

export function totp(secret: string, at = Date.now()) {
  const bits = [...secret.replace(/=+$/, "").toUpperCase()].map((c) => BASE32.indexOf(c).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const hash = createHmac("sha1", key).update(counter).digest();
  const offset = hash[hash.length - 1] & 15;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}
