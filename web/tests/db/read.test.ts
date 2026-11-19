// Who can read what, table by table, and who can see contact details.
import { beforeAll, describe, expect, it } from "vitest";
import {
  A, ADMIN, B, accessToken, expectSees, guest, id, rows, signInAs, signedOut, url, type Client,
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
  opportunities: "id, status, submitted_by",
  opportunity_reports: "opportunity_id, user_id",
  opportunity_participants: "opportunity_id, user_id",
  teams: "id, owner_id",
  team_applications: "id, team_id, user_id, status",
  projects: "id, user_id",
  experiences: "id, user_id",
  awards: "id, user_id",
  award_teammates: "award_id, user_id, status",
  notifications: "id, user_id",
  admins: "user_id",
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
    opportunities: (r) => r.status === "live" || r.submitted_by === me || admin,
    opportunity_reports: (r) => r.user_id === me || admin,
    opportunity_participants: everything,
    teams: everything,
    team_applications: (r) => r.status === "accepted" || r.user_id === me || teamOwner.get(r.team_id) === me,
    projects: everything,
    experiences: everything,
    awards: everything,
    award_teammates: (r) => r.status === "confirmed" || r.user_id === me || awardOwner.get(r.award_id) === me,
    notifications: (r) => r.user_id === me,
    admins: () => false,
  };
}

let userA: Client, userB: Client, admin: Client, guestClient: Client, guestId: string;

beforeAll(async () => {
  [userA, userB, admin] = await Promise.all([signInAs(1), signInAs(2), signInAs(20)]);
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

  it("are hidden from everyone else", async () => {
    expect(await contact(userA, 2)).toEqual([]); // no relation
    expect(await contact(userA, 5)).toEqual([]); // A's request is pending
    expect(await contact(userA, 6)).toEqual([]); // their request to A is pending
    expect(await contact(userA, 7)).toEqual([]); // declined
    expect(await contact(userA, 18)).toEqual([]); // A's application to their team is pending
    expect(await contact(await signInAs(18), 1)).toEqual([]); // the owner can't see a pending applicant either
    expect(await contact(userB, 9)).toEqual([]); // pending applicant to B's team
    expect(await contact(userB, 10)).toEqual([]); // declined applicant to B's team
    expect(await contact(userA, 16)).toEqual([]); // fellow member, not the owner: not shared (by design)
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

  it("is_admin is true only for admins", async () => {
    expect((await admin.rpc("is_admin")).data).toBe(true);
    expect((await userA.rpc("is_admin")).data).toBe(false);
    expect((await guestClient.rpc("is_admin")).data).toBe(false);
  });

  // Low: display_name() is security definer and executable by anon, so anyone with the public key
  // can turn a profile id into a name without signing in. Fix: revoke execute from anon (see report).
  it.fails("KNOWN ISSUE (Low): display_name is closed to signed-out visitors", async () => {
    const { data, error } = await signedOut().rpc("display_name", { profile_id: A });
    expect(error ?? data === null).toBeTruthy();
  });
});
