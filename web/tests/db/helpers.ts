// Shared setup for the database permission tests (npm run test:db).
// They sign in as seeded users of the LOCAL Supabase and check what each one can read and write.
import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect } from "vitest";

type Status = { API_URL: string; PUBLISHABLE_KEY?: string; ANON_KEY: string; SECRET_KEY?: string; SERVICE_ROLE_KEY: string };

const status = JSON.parse(
  execFileSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }),
) as Status;

export const url = status.API_URL;
// Never point these tests at a hosted project: they write, and they use the service key
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url)) throw new Error(`Refusing to run against ${url}: local Supabase only`);

const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const options = { auth: { persistSession: false, autoRefreshToken: false } };

export type Client = SupabaseClient;

// Bypasses row level security: used only to set up, clean up and read the truth
export const service = createClient(url, status.SECRET_KEY ?? status.SERVICE_ROLE_KEY, options);

const pad = (n: number) => String(n).padStart(12, "0");
// Same ids as supabase/seed.local.sql
export const id = (n: number) => `00000000-0000-4000-8000-${pad(n)}`;
export const opportunityId = (n: number) => `00000000-0000-4000-9000-${pad(n)}`;
export const teamId = (n: number) => `00000000-0000-4000-a000-${pad(n)}`;
export const awardId = (n: number) => `00000000-0000-4000-b000-${pad(n)}`;

export const A = id(1);
export const B = id(2);
export const ADMIN = id(20);

export const signedOut = (): Client => createClient(url, publishableKey, options);

export async function signInAs(n: number): Promise<Client> {
  const client = signedOut();
  const { error } = await client.auth.signInWithPassword({ email: `student${String(n).padStart(2, "0")}@schub.test`, password: "password123" });
  if (error) throw error;
  return client;
}

export async function guest(): Promise<{ client: Client; userId: string }> {
  const client = signedOut();
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw error ?? new Error("No guest");
  return { client, userId: data.user.id };
}

export async function accessToken(client: Client) {
  return (await client.auth.getSession()).data.session?.access_token ?? "";
}

type Row = Record<string, unknown>;
const sortRows = (rows: Row[]) => [...rows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

export async function rows(table: string, columns = "*"): Promise<Row[]> {
  const { data, error } = await service.from(table).select(columns);
  if (error) throw error;
  return sortRows((data ?? []) as unknown as Row[]);
}

// Runs `attempt` and checks the tables are exactly as they were. Blocked updates and deletes
// don't raise errors under row level security; they just touch no rows, so the data is what counts.
export async function expectNoChange(tables: string[], attempt: () => PromiseLike<unknown>) {
  const before = await Promise.all(tables.map((t) => rows(t)));
  await attempt();
  const after = await Promise.all(tables.map((t) => rows(t)));
  tables.forEach((t, i) => expect(after[i], `${t} changed`).toEqual(before[i]));
}

// An insert or a column-level update that the database refuses
export function expectRefused(result: { error: { code?: string; message: string } | null }) {
  expect(result.error, "expected the database to refuse this").not.toBeNull();
}

// The rows `client` can read are exactly the rows `allowed` picks out of the real table
export async function expectSees(client: Client, table: string, columns: string, allowed: (row: Row) => boolean) {
  const truth = (await rows(table, columns)).filter(allowed);
  const { data, error } = await client.from(table).select(columns);
  expect(error, `${table}: ${error?.message}`).toBeNull();
  expect(sortRows((data ?? []) as unknown as Row[]), table).toEqual(truth);
}
