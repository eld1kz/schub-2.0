// Guests (anonymous accounts the proxy creates) and signed-out visitors can't write anything.
import { beforeAll, describe, it } from "vitest";
import { A, awardId, expectNoChange, expectRefused, guest, opportunityId, signedOut, teamId, type Client } from "./helpers";

const allTables = [
  "profiles", "posts", "ideas", "connections", "opportunities", "opportunity_reports", "opportunity_participants",
  "teams", "team_applications", "projects", "experiences", "awards", "award_teammates", "notifications", "admins",
];

// One plausible row per table, written as `me`
const newRows = (me: string): Record<string, Record<string, unknown>> => ({
  profiles: { id: me, name: "Guest" },
  posts: { author_id: me, content: "Spam" },
  ideas: { author_id: me, title: "Spam" },
  connections: { sender_id: me, receiver_id: A },
  opportunities: { title: "Guest opportunity", type: "hackathon", url: "https://example.com/guest", deadline: "2030-01-01", submitted_by: me },
  opportunity_reports: { opportunity_id: opportunityId(1), user_id: me, reason: "fake" },
  opportunity_participants: { opportunity_id: opportunityId(1), user_id: me },
  teams: { owner_id: me, title: "Guest team", roles: ["Backend"] },
  team_applications: { team_id: teamId(3), user_id: me, role: "Frontend" },
  projects: { user_id: me, title: "Guest project" },
  experiences: { user_id: me, role: "Guest", company: "Guest", start_date: "2025-01-01" },
  awards: { user_id: me, placement: "Winner", event_name: "Guest event", awarded_on: "2025-01-01" },
  award_teammates: { award_id: awardId(1), user_id: me },
  notifications: { user_id: me, type: "connection_request", message: "x", link: "/people" },
  admins: { user_id: me },
});

// A change to every row: each table has at least one of these columns
const updates: Record<string, Record<string, unknown>> = {
  profiles: { name: "Hacked" }, posts: { content: "Hacked" }, ideas: { title: "Hacked" }, connections: { status: "accepted" },
  opportunities: { status: "removed" }, opportunity_reports: { reason: "other" }, opportunity_participants: { note: "Hacked" },
  teams: { title: "Hacked" }, team_applications: { status: "accepted" }, projects: { title: "Hacked" },
  experiences: { role: "Hacked" }, awards: { placement: "Winner" }, award_teammates: { status: "confirmed" },
  notifications: { read: true }, admins: { user_id: A },
};

// Matches every row (all of these tables have a created_at or user_id that's never null)
const everyRow = (table: string) => (table === "admins" ? "user_id" : "created_at");

async function triesToWriteEverything(client: Client, me: string) {
  for (const table of allTables) {
    await client.from(table).insert(newRows(me)[table]);
    await client.from(table).update(updates[table]).not(everyRow(table), "is", null);
    await client.from(table).delete().not(everyRow(table), "is", null);
  }
}

describe("guests", () => {
  let client: Client;
  let me: string;
  beforeAll(async () => {
    ({ client, userId: me } = await guest());
  });

  it("can't insert, update or delete anything in any table", async () => {
    await expectNoChange(allTables, () => triesToWriteEverything(client, me));
  });

  it("can't even edit their own profile", async () => {
    await expectNoChange(["profiles"], () => client.from("profiles").update({ name: "Guest", bio: "Spam" }).eq("id", me));
  });

  it("can't call a write path through the RPC functions", async () => {
    await expectNoChange(allTables, async () => {
      await client.rpc("handle_new_user");
      await client.rpc("notify_connection");
    });
  });

  it("each insert is refused outright, not silently dropped", async () => {
    for (const table of ["connections", "teams", "team_applications", "awards", "projects", "opportunities"]) {
      expectRefused(await client.from(table).insert(newRows(me)[table]));
    }
  });
});

describe("signed-out visitors", () => {
  it("can't insert, update or delete anything in any table", async () => {
    await expectNoChange(allTables, () => triesToWriteEverything(signedOut(), "00000000-0000-4000-8000-000000000099"));
  });
});
