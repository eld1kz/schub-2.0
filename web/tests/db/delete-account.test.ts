// supabase/delete-account.sql: delete_my_account() deletes the caller and only the caller
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ADMIN, guest, id, opportunityId, service, signedOut, signInAs, type Client } from "./helpers";

// Straight SQL against the local database container, for what the API can't show (the foreign keys)
const container = `supabase_db_${readFileSync("supabase/config.toml", "utf8").match(/^project_id = "(.*)"/m)?.[1]}`;
const sql = (query: string) => execFileSync("docker", ["exec", "-i", container, "psql", "-tA", "-U", "postgres", "-d", "postgres", "-c", query], { encoding: "utf8" }).trim();

// Every column, anywhere outside auth, that points at a user
const userColumns = () =>
  sql(`
    select c.conrelid::regclass || '.' || a.attname
    from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.contype = 'f' and c.confrelid in ('public.profiles'::regclass, 'auth.users'::regclass)
      and c.conrelid::regclass::text not like 'auth.%'
  `).split("\n").filter(Boolean);

const created: string[] = [];
const leftovers: string[] = [];
let accounts = 0;
async function account(name: string) {
  const email = `delete-${Date.now()}-${accounts++}@schub.test`;
  const { data, error } = await service.auth.admin.createUser({ email, password: "password123", email_confirm: true, user_metadata: { name } });
  if (error || !data.user) throw error ?? new Error("No user");
  created.push(data.user.id);
  const client = signedOut();
  await client.auth.signInWithPassword({ email, password: "password123" });
  return { id: data.user.id, client };
}

// A read that must work, and its data
const must = <T,>(r: { data: T; error: { message: string } | null }): NonNullable<T> => {
  if (r.error || r.data === null || r.data === undefined) throw new Error(r.error?.message ?? "No data");
  return r.data as NonNullable<T>;
};
// A write that must work
const ok = (r: { error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
};

afterAll(async () => {
  for (const u of created) await service.auth.admin.deleteUser(u).catch(() => {});
  if (leftovers.length) await service.from("opportunities").delete().in("id", leftovers);
});

describe("delete_my_account", () => {
  let owner: { id: string; client: Client };
  let first: { id: string; client: Client };
  let second: { id: string; client: Client };
  let pending: { id: string; client: Client };
  let team: string;
  let empty: string;
  let opportunity: string;
  let othersAward: string;

  beforeAll(async () => {
    [owner, first, second, pending] = await Promise.all([account("Owen Leaving"), account("Fiona First"), account("Sam Second"), account("Pat Pending")]);
    team = must(await service.from("teams").insert({ owner_id: owner.id, title: "Handover Team", description: "", roles: ["Backend", "Design", "ML"] }).select("id").single()).id;
    empty = must(await service.from("teams").insert({ owner_id: owner.id, title: "Solo Team", description: "", roles: ["Backend"] }).select("id").single()).id;

    // Sam applies first but is accepted second, so the team goes to Fiona: who was accepted earliest counts
    ok(await second.client.from("team_applications").insert({ team_id: team, user_id: second.id, role: "Design" }));
    ok(await first.client.from("team_applications").insert({ team_id: team, user_id: first.id, role: "Backend" }));
    ok(await pending.client.from("team_applications").insert({ team_id: team, user_id: pending.id, role: "ML" }));
    ok(await owner.client.from("team_applications").update({ status: "accepted" }).eq("team_id", team).eq("user_id", first.id));
    await new Promise((r) => setTimeout(r, 20));
    ok(await owner.client.from("team_applications").update({ status: "accepted" }).eq("team_id", team).eq("user_id", second.id));

    // Something in every table that can hold the owner
    opportunity = must(await service.from("opportunities").insert({ title: `Leaver's Hackathon ${Date.now()}`, url: "https://example.com/leaver", type: "hackathon", organizer: "Test", submitted_by: owner.id, deadline: new Date(Date.UTC(2090, 0, 1) + (Date.now() % 3650) * 86_400_000).toISOString().slice(0, 10) }).select("id").single()).id;
    leftovers.push(opportunity);
    ok(await service.from("opportunity_participants").insert({ opportunity_id: opportunityId(1), user_id: owner.id }));
    ok(await service.from("reports").insert({ target_type: "event", target_id: opportunityId(2), reporter_id: owner.id, reason: "other" }));
    ok(await service.from("experiences").insert({ user_id: owner.id, role: "Dev", company: "Co", start_date: "2025-01-01" }));
    ok(await service.from("projects").insert({ user_id: owner.id, title: "Thing" }));
    ok(await service.from("posts").insert({ author_id: owner.id, content: "hi" }));
    ok(await service.from("ideas").insert({ author_id: owner.id, title: "idea" }));
    ok(await service.from("connections").insert({ sender_id: owner.id, receiver_id: first.id, status: "accepted" }));
    ok(await service.from("connections").insert({ sender_id: second.id, receiver_id: owner.id, status: "pending" }));
    const ownAward = must(await service.from("awards").insert({ user_id: owner.id, placement: "Winner", event_name: "Own Win", awarded_on: "2025-05-01" }).select("id").single()).id;
    ok(await service.from("award_teammates").insert({ award_id: ownAward, user_id: first.id, status: "confirmed" }));
    othersAward = must(await service.from("awards").insert({ user_id: second.id, placement: "Finalist", event_name: "Sam's Final", awarded_on: "2025-06-01" }).select("id").single()).id;
    ok(await service.from("award_teammates").insert({ award_id: othersAward, user_id: owner.id, status: "confirmed" }));
    ok(await service.from("notifications").insert({ user_id: first.id, actor_id: owner.id, type: "connection_request", message: "x", link: "/people" }));

    // Everything above really points at the owner before the deletion
    const before = userColumns().map((col) => Number(sql(`select count(*) from ${col.split(".")[0]} where ${col.split(".")[1]} = '${owner.id}'`)));
    expect(before.filter((n) => n > 0).length).toBeGreaterThanOrEqual(15);

    const { error } = await owner.client.rpc("delete_my_account");
    expect(error).toBeNull();
  });

  it("leaves no row anywhere that references the user", async () => {
    const columns = userColumns();
    expect(columns.length).toBeGreaterThanOrEqual(17);
    for (const col of columns) {
      const [table, column] = col.split(".");
      expect(Number(sql(`select count(*) from ${table} where ${column} = '${owner.id}'`)), col).toBe(0);
    }
    expect(sql(`select count(*) from auth.users where id = '${owner.id}'`)).toBe("0");
    expect(sql(`select count(*) from auth.identities where user_id = '${owner.id}'`)).toBe("0");
  });

  it("hands the team to the member accepted earliest, who stops filling a role on it", async () => {
    const t = must(await service.from("teams").select("owner_id, roles").eq("id", team).single());
    expect(t).toEqual({ owner_id: first.id, roles: ["Design", "ML"] });
    const apps = must(await service.from("team_applications").select("user_id, status").eq("team_id", team).order("user_id"));
    expect(apps).toEqual(expect.arrayContaining([{ user_id: second.id, status: "accepted" }, { user_id: pending.id, status: "pending" }]));
    expect(apps.some((a) => a.user_id === first.id)).toBe(false);
  });

  it("tells the team who runs it now", async () => {
    const note = async (u: string) => must(await service.from("notifications").select("type, message, link").eq("user_id", u).eq("type", "team_owner_changed"));
    expect(await note(first.id)).toEqual([{ type: "team_owner_changed", message: "Owen Leaving deleted their account, so you now run Handover Team", link: `/teams/${team}` }]);
    expect(await note(second.id)).toEqual([{ type: "team_owner_changed", message: "Owen Leaving deleted their account. Fiona First now runs Handover Team", link: `/teams/${team}` }]);
    // Pending applicants aren't on the team
    expect(await note(pending.id)).toEqual([]);
  });

  it("deletes a team nobody else is on", async () => {
    expect(must(await service.from("teams").select("id").eq("id", empty))).toEqual([]);
  });

  it("keeps opportunities they submitted, without a submitter", async () => {
    expect(must(await service.from("opportunities").select("submitted_by").eq("id", opportunity).single())).toEqual({ submitted_by: null });
  });

  it("removes their tag from someone else's award, and keeps the award", async () => {
    expect(must(await service.from("awards").select("id").eq("id", othersAward))).toHaveLength(1);
    expect(must(await service.from("award_teammates").select("user_id").eq("award_id", othersAward))).toEqual([]);
  });

  it("can't be used again with the deleted account's token, or for anyone else", async () => {
    const { client: guestClient } = await guest();
    const people = sql("select count(*) from profiles");
    expect((await owner.client.rpc("delete_my_account")).error?.message).toBe("Sign in to delete your account.");
    // It takes no arguments, so there's no way to name someone else
    expect((await first.client.rpc("delete_my_account", { user_id: second.id })).error).not.toBeNull();
    expect((await signedOut().rpc("delete_my_account")).error).not.toBeNull();
    expect((await guestClient.rpc("delete_my_account")).error).not.toBeNull();
    expect(sql("select count(*) from profiles")).toBe(people);
  });
});

describe("the last admin", () => {
  it("can't delete their account, and is told why before trying", async () => {
    const admin = await signInAs(20);
    const message = "You're the only admin. Make someone else an admin before deleting your account.";
    expect((await admin.rpc("my_account_deletion_blocker")).data).toBe(message);
    expect((await admin.rpc("delete_my_account")).error?.message).toBe(message);
    expect(sql(`select count(*) from auth.users where id = '${ADMIN}'`)).toBe("1");
    expect((await (await signInAs(1)).rpc("my_account_deletion_blocker")).data).toBe("");
  });

  it("an anonymous guest admin doesn't count as another admin; a real one does", async () => {
    const admin = await signInAs(20);
    const { userId: guestId } = await guest();
    sql(`insert into admins (user_id) values ('${guestId}')`);
    expect((await admin.rpc("my_account_deletion_blocker")).data).not.toBe("");
    sql(`insert into admins (user_id) values ('${id(2)}')`);
    expect((await admin.rpc("my_account_deletion_blocker")).data).toBe("");
    sql(`delete from admins where user_id in ('${guestId}', '${id(2)}')`);
  });
});
