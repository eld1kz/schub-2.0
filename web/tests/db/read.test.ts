// Who can read what, table by table, and who can see contact details.
import { beforeAll, describe, expect, it } from "vitest";
import {
  A, ADMIN, B, accessToken, adminWithoutCode, expectSees, guest, id, rows, signInAs, signInAsAdmin, signedOut, url, type Client,
} from "./helpers";

// A signed-out visitor has no id; nothing matches this one
const NOBODY = "00000000-0000-0000-0000-000000000000";

const everything = () => true;

// What each table's rows are checked by, and the columns to compare
const tables: Record<string, string> = {
  profiles: "id, name",
  posts: "id",
  ideas: "id",
  connections: "id, sender_id, receiver_id, status",
  opportunities: "id, status, needs_review, submitted_by",
  reports: "id, target_type, target_id, reporter_id, status",
  opportunity_participants: "opportunity_id, user_id",
  teams: "id, owner_id",
  team_applications: "id, team_id, user_id, status",
  team_entries: "team_id, opportunity_id, status",
  projects: "id, user_id",
  experiences: "id, user_id",
  awards: "id, user_id",
  award_teammates: "award_id, user_id, status",
  notifications: "id, user_id",
  admins: "user_id",
  suspensions: "user_id",
  admin_actions: "id",
};

let teamOwner: Map<unknown, unknown>;
let awardOwner: Map<unknown, unknown>;

// The rows `me` should see in each table, straight from the policies' intent
function allowedFor(me: string, admin: boolean): Record<string, (r: Record<string, unknown>) => boolean> {
  return {
    profiles: everything,
    posts: everything,
    ideas: everything,
    connections: (r) => r.sender_id === me || r.receiver_id === me,
    opportunities: (r) => (r.status === "live" && !r.needs_review) || r.submitted_by === me || admin,
    reports: (r) => r.reporter_id === me || admin,
    opportunity_participants: everything,
    teams: everything,
    team_applications: (r) => r.status === "accepted" || r.user_id === me || teamOwner.get(r.team_id) === me,
    team_entries: everything,
    projects: everything,
    experiences: everything,
    awards: everything,
    award_teammates: (r) => r.status === "confirmed" || r.user_id === me || awardOwner.get(r.award_id) === me,
    notifications: (r) => r.user_id === me,
    admins: () => false,
    suspensions: (r) => r.user_id === me || admin,
    admin_actions: () => admin,
  };
}

let userA: Client, userB: Client, admin: Client, guestClient: Client, guestId: string;

beforeAll(async () => {
  // The admin with their code entered; admin.test.ts checks the admin without it
  [userA, userB, admin] = await Promise.all([signInAs(1), signInAs(2), signInAsAdmin()]);
  ({ client: guestClient, userId: guestId } = await guest());
  teamOwner = new Map((await rows("teams", "id, owner_id")).map((t) => [t.id, t.owner_id]));
  awardOwner = new Map((await rows("awards", "id, user_id")).map((a) => [a.id, a.user_id]));
});

describe("reading tables", () => {
  for (const [table, columns] of Object.entries(tables)) {
    it(`${table}: signed-out visitors see only what's public`, async () => {
      await expectSees(signedOut(), table, columns, allowedFor(NOBODY, false)[table]);
    });
    it(`${table}: an old anonymous guest session sees what any signed-in user sees`, async () => {
      await expectSees(guestClient, table, columns, allowedFor(guestId, false)[table]);
    });
    it(`${table}: user A sees only their share`, async () => {
      await expectSees(userA, table, columns, allowedFor(A, false)[table]);
    });
    it(`${table}: user B sees only their share`, async () => {
      await expectSees(userB, table, columns, allowedFor(B, false)[table]);
    });
    it(`${table}: the admin sees only their share`, async () => {
      await expectSees(admin, table, columns, allowedFor(ADMIN, true)[table]);
    });
  }
});

describe("contact details (telegram, email)", () => {
  const contact = async (client: Client, n: number) => (await client.rpc("contact_for", { profile_id: id(n) })).data ?? [];

  it("are never readable from the profiles table", async () => {
    for (const client of [signedOut(), userA, guestClient, admin]) {
      expect((await client.from("profiles").select("email")).error).not.toBeNull();
      expect((await client.from("profiles").select("telegram")).error).not.toBeNull();
      expect((await client.from("profiles").select("*")).error).not.toBeNull();
      // Not even as a filter, which would let someone guess them one character at a time
      expect((await client.from("profiles").select("id").eq("email", "student03.contact@example.com")).error).not.toBeNull();
      expect((await client.from("profiles").select("id").like("telegram", "fake%")).error).not.toBeNull();
      expect((await client.from("profiles").select("id").or("email.eq.x,name.eq.y")).error).not.toBeNull();
      expect((await client.from("profiles").select("id").order("email")).error).not.toBeNull();
      // Nor through an embedded profile
      expect((await client.from("teams").select("id, owner:profiles(email)")).error).not.toBeNull();
    }
  });

  it("are not in the GraphQL API either", async () => {
    const res = await fetch(`${url}/graphql/v1`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: (userA as unknown as { supabaseKey: string }).supabaseKey, authorization: `Bearer ${await accessToken(userA)}` },
      body: JSON.stringify({ query: "{ profilesCollection(first: 50) { edges { node { id email telegram } } } }" }),
    });
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain("contact@example.com");
    expect(body).not.toContain("fake_student_");
  });

  it("are visible to yourself, accepted connections in either direction, and a team owner and their accepted member", async () => {
    expect(await contact(userA, 1)).toHaveLength(1); // yourself
    expect(await contact(userA, 3)).toHaveLength(1); // A asked 03, accepted
    expect(await contact(userA, 4)).toHaveLength(1); // 04 asked A, accepted
    expect(await contact(userA, 14)).toHaveLength(1); // owner of a team A was accepted to
    expect(await contact(await signInAs(14), 1)).toHaveLength(1); // and back
  });

  // supabase/team-contact.sql: the team is the owner plus everyone accepted
  it("are visible between two accepted members of the same team", async () => {
    expect(await contact(userA, 16)).toHaveLength(1); // A and 16 are both accepted on Testerson Robotics
    expect(await contact(await signInAs(16), 1)).toHaveLength(1);
    const eight = await signInAs(8); // 8 and 14 are both accepted on Full Sample Team
    expect(await contact(eight, 14)).toHaveLength(1);
    expect(await contact(await signInAs(14), 8)).toHaveLength(1);
    expect(await contact(eight, 7)).toHaveLength(1); // and its owner
  });

  it("stay hidden between members of different teams", async () => {
    expect(await contact(userA, 8)).toEqual([]); // A is on Testerson Robotics, 8 on Full Sample Team
    expect(await contact(await signInAs(8), 1)).toEqual([]);
    expect(await contact(await signInAs(16), 8)).toEqual([]);
  });

  it("stay hidden from pending applicants, both ways", async () => {
    // A is pending on Prototype Fintech, where 17 is accepted and 19 is also pending
    expect(await contact(userA, 17)).toEqual([]);
    expect(await contact(await signInAs(17), 1)).toEqual([]);
    expect(await contact(userA, 19)).toEqual([]);
    // 9 and 15 are both pending on Mock Team With Pending
    const nine = await signInAs(9);
    expect(await contact(nine, 15)).toEqual([]);
    expect(await contact(nine, 2)).toEqual([]); // nor its owner (9's connection request to 2 is pending)
  });

  it("are hidden from everyone else", async () => {
    expect(await contact(userA, 2)).toEqual([]); // no relation
    expect(await contact(userA, 5)).toEqual([]); // A's request is pending
    expect(await contact(userA, 6)).toEqual([]); // their request to A is pending
    expect(await contact(userA, 7)).toEqual([]); // declined
    expect(await contact(userA, 18)).toEqual([]); // A's application to their team is pending
    expect(await contact(await signInAs(18), 1)).toEqual([]); // the owner can't see a pending applicant either
    expect(await contact(userB, 9)).toEqual([]); // pending applicant to B's team
    expect(await contact(userB, 10)).toEqual([]); // declined applicant to B's team
    expect(await contact(admin, 1)).toEqual([]); // admins get nothing extra
    expect(await contact(guestClient, 1)).toEqual([]);
    expect(await contact(signedOut(), 1)).toEqual([]);
  });

  it("disappear when a connection is declined after being accepted", async () => {
    const userThree = await signInAs(3);
    expect(await contact(userThree, 1)).toHaveLength(1);
    // 03 is the receiver of A's accepted request, so 03 can change it
    const { data: link } = await userThree.from("connections").update({ status: "declined" }).eq("sender_id", A).eq("receiver_id", id(3)).select("id").single();
    expect(link).not.toBeNull();
    expect(await contact(userA, 3)).toEqual([]);
    await userThree.from("connections").update({ status: "accepted" }).eq("sender_id", A).eq("receiver_id", id(3));
  });
});

describe("functions", () => {
  it("connections_of returns only id, name and photo, to anyone (profile pages list connections)", async () => {
    for (const client of [userB, signedOut()]) {
      const { data } = await client.rpc("connections_of", { profile_id: A });
      expect(data?.length).toBeGreaterThan(0);
      for (const row of data ?? []) expect(Object.keys(row).sort()).toEqual(["avatar_url", "id", "name"]);
    }
  });

  it("skill_counts counts named people per skill, for anyone", async () => {
    const truth = new Map<string, number>();
    for (const p of await rows("profiles", "name, skills")) {
      if (p.name) for (const skill of p.skills as string[]) truth.set(skill, (truth.get(skill) ?? 0) + 1);
    }
    for (const client of [signedOut(), userA]) {
      const { data } = await client.rpc("skill_counts");
      expect(new Map((data ?? []).map((r: { skill: string; people: number }) => [r.skill, Number(r.people)]))).toEqual(truth);
    }
  });

  it("is_admin is true only for admins", async () => {
    expect((await admin.rpc("is_admin")).data).toBe(true);
    // Until the admin enters the code from their authenticator (supabase/admin.sql)
    expect((await (await adminWithoutCode()).rpc("is_admin")).data).toBe(false);
    expect((await userA.rpc("is_admin")).data).toBe(false);
    expect((await guestClient.rpc("is_admin")).data).toBe(false);
  });

  // Security definer: signed-out visitors can't use it to turn ids into names (supabase/display-name.sql)
  it("display_name is closed to signed-out visitors", async () => {
    const { data, error } = await signedOut().rpc("display_name", { profile_id: A });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
