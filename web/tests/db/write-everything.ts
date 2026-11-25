// Tries to write every table: one plausible row each as `me`, a change to every row, and deleting every row.
// Guests, signed-out visitors and suspended members (guest.test.ts, admin.test.ts) must change nothing.
import { A, awardId, opportunityId, teamId, type Client } from "./helpers";

export const allTables = [
  "profiles", "posts", "ideas", "connections", "opportunities", "reports", "opportunity_participants",
  "teams", "team_applications", "projects", "experiences", "awards", "award_teammates", "notifications", "admins",
  "suspensions", "admin_actions",
];

// One plausible row per table, written as `me`
export const newRows = (me: string): Record<string, Record<string, unknown>> => ({
  profiles: { id: me, name: "Guest" },
  posts: { author_id: me, content: "Spam" },
  ideas: { author_id: me, title: "Spam" },
  connections: { sender_id: me, receiver_id: A },
  opportunities: { title: "Guest opportunity", type: "hackathon", url: "https://example.com/guest", deadline: "2030-01-01", submitted_by: me },
  reports: { target_type: "event", target_id: opportunityId(1), reporter_id: me, reason: "fake" },
  opportunity_participants: { opportunity_id: opportunityId(1), user_id: me },
  teams: { owner_id: me, title: "Guest team", roles: ["Backend"] },
  team_applications: { team_id: teamId(3), user_id: me, role: "Frontend" },
  projects: { user_id: me, title: "Guest project" },
  experiences: { user_id: me, role: "Guest", company: "Guest", start_date: "2025-01-01" },
  awards: { user_id: me, placement: "Winner", event_name: "Guest event", awarded_on: "2025-01-01" },
  award_teammates: { award_id: awardId(1), user_id: me },
  notifications: { user_id: me, type: "connection_request", message: "x", link: "/people" },
  admins: { user_id: me },
  suspensions: { user_id: me, reason: "Self" },
  admin_actions: { admin_id: me, action: "hide", target_type: "person", target_id: A },
});

// A change to every row: each table has at least one of these columns
const updates: Record<string, Record<string, unknown>> = {
  profiles: { name: "Hacked" }, posts: { content: "Hacked" }, ideas: { title: "Hacked" }, connections: { status: "accepted" },
  opportunities: { status: "removed" }, reports: { status: "dismissed" }, opportunity_participants: { note: "Hacked" },
  teams: { title: "Hacked" }, team_applications: { status: "accepted" }, projects: { title: "Hacked" },
  experiences: { role: "Hacked" }, awards: { placement: "Winner" }, award_teammates: { status: "confirmed" },
  notifications: { read: true }, admins: { user_id: A }, suspensions: { reason: "Changed" }, admin_actions: { reason: "Changed" },
};

// Matches every row (all of these tables have a created_at or user_id that's never null)
const everyRow = (table: string) => (table === "admins" ? "user_id" : "created_at");

export async function triesToWriteEverything(client: Client, me: string) {
  for (const table of allTables) {
    await client.from(table).insert(newRows(me)[table]);
    await client.from(table).update(updates[table]).not(everyRow(table), "is", null);
    await client.from(table).delete().not(everyRow(table), "is", null);
  }
}
