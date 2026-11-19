// Who can insert, update and delete what, for signed-in members and the admin.
// Guests and signed-out visitors are in guest.test.ts.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  A, ADMIN, B, awardId, expectNoChange, expectRefused, id, opportunityId, rows, service, signInAs, teamId, type Client,
} from "./helpers";

let userA: Client, userB: Client, admin: Client;

beforeAll(async () => {
  [userA, userB, admin] = await Promise.all([signInAs(1), signInAs(2), signInAs(20)]);
});

const one = async (table: string, match: Record<string, unknown>) => {
  const { data, error } = await service.from(table).select("*").match(match).single();
  if (error) throw error;
  return data as Record<string, unknown>;
};

describe("profiles", () => {
  it("you can edit your own", async () => {
    const before = await one("profiles", { id: A });
    const { error } = await userA.from("profiles").update({ headline: "Edited by a test" }).eq("id", A);
    expect(error).toBeNull();
    expect((await one("profiles", { id: A })).headline).toBe("Edited by a test");
    await service.from("profiles").update({ headline: before.headline }).eq("id", A);
  });

  it("nobody can edit someone else's, not even the admin", async () => {
    await expectNoChange(["profiles"], async () => {
      await userA.from("profiles").update({ name: "Hacked", telegram: "hacked", email: "x@evil.test" }).eq("id", B);
      await admin.from("profiles").update({ name: "Hacked" }).eq("id", B);
      await userA.from("profiles").update({ name: "Hacked" }).neq("id", A);
    });
  });

  it("you can't move your profile onto someone else's id, add profiles or delete them", async () => {
    await expectNoChange(["profiles"], async () => {
      expectRefused(await userA.from("profiles").update({ id: id(99) }).eq("id", A));
      expectRefused(await userA.from("profiles").insert({ id: id(98), name: "New" }));
      await userA.from("profiles").delete().eq("id", A);
      await userA.from("profiles").delete().eq("id", B);
    });
  });
});

describe("projects, experience, posts and ideas", () => {
  const owned = [
    { table: "projects", owner: "user_id", row: { title: "Test project" } },
    { table: "experiences", owner: "user_id", row: { role: "Tester", company: "Test", start_date: "2025-01-01" } },
    { table: "posts", owner: "author_id", row: { content: "Test post" } },
    { table: "ideas", owner: "author_id", row: { title: "Test idea" } },
  ];

  for (const { table, owner, row } of owned) {
    it(`${table}: you can add, edit and delete your own`, async () => {
      const { data, error } = await userA.from(table).insert({ ...row, [owner]: A }).select("id").single();
      expect(error).toBeNull();
      if (table === "projects" || table === "experiences") {
        expect((await userA.from(table).update({ description: "Edited" }).eq("id", data?.id).select("id")).data).toHaveLength(1);
      }
      expect((await userA.from(table).delete().eq("id", data?.id).select("id")).data).toHaveLength(1);
    });

    it(`${table}: nobody can add one for someone else, or edit or delete someone else's`, async () => {
      const { data: theirs } = await service.from(table).insert({ ...row, [owner]: B }).select("id").single();
      await expectNoChange([table], async () => {
        expectRefused(await userA.from(table).insert({ ...row, [owner]: B }));
        await userA.from(table).update({ [owner]: A }).eq("id", theirs?.id);
        if (table === "projects" || table === "experiences") await userA.from(table).update({ description: "Hacked" }).eq("id", theirs?.id);
        await userA.from(table).delete().eq("id", theirs?.id);
        await admin.from(table).delete().eq("id", theirs?.id);
      });
      await service.from(table).delete().eq("id", theirs?.id);
    });
  }

  it("you can't hand your project to someone else", async () => {
    const { data } = await userA.from("projects").insert({ title: "Mine", user_id: A }).select("id").single();
    await expectNoChange(["projects"], async () => {
      expectRefused(await userA.from("projects").update({ user_id: B }).eq("id", data?.id));
    });
    await service.from("projects").delete().eq("id", data?.id);
  });
});

describe("connections", () => {
  it("you can only ask as yourself, and every request starts pending", async () => {
    await expectNoChange(["connections"], async () => {
      expectRefused(await userA.from("connections").insert({ sender_id: B, receiver_id: id(19) }));
      expectRefused(await userA.from("connections").insert({ sender_id: id(19), receiver_id: A }));
      expectRefused(await userA.from("connections").insert({ sender_id: A, receiver_id: id(19), status: "accepted" }));
      expectRefused(await userA.from("connections").insert({ sender_id: A, receiver_id: A }));
    });
  });

  it("the sender can't accept their own request", async () => {
    await expectNoChange(["connections"], () => userA.from("connections").update({ status: "accepted" }).eq("sender_id", A).eq("receiver_id", id(5)));
  });

  it("the receiver can only change the status, never who it's from or to", async () => {
    await expectNoChange(["connections"], async () => {
      expectRefused(await userA.from("connections").update({ sender_id: B }).eq("sender_id", id(6)).eq("receiver_id", A));
      expectRefused(await userA.from("connections").update({ receiver_id: B }).eq("sender_id", id(6)).eq("receiver_id", A));
    });
  });

  it("nobody else can change or delete a connection, not even the admin", async () => {
    await expectNoChange(["connections"], async () => {
      await userB.from("connections").update({ status: "declined" }).eq("sender_id", A).eq("receiver_id", id(3));
      await userB.from("connections").update({ status: "accepted" }).eq("sender_id", A).eq("receiver_id", id(5));
      await admin.from("connections").update({ status: "accepted" }).eq("sender_id", A).eq("receiver_id", id(5));
      await userB.from("connections").delete().eq("sender_id", A);
      await admin.from("connections").delete().eq("sender_id", A);
    });
  });

  it("only the sender can withdraw, and only while it's pending", async () => {
    await expectNoChange(["connections"], async () => {
      await userA.from("connections").delete().eq("sender_id", A).eq("receiver_id", id(3)); // accepted
      await userA.from("connections").delete().eq("sender_id", A).eq("receiver_id", id(7)); // declined
      await userA.from("connections").delete().eq("sender_id", id(6)).eq("receiver_id", A); // A is the receiver
    });
    const { data } = await userA.from("connections").delete().eq("sender_id", A).eq("receiver_id", id(5)).select("id");
    expect(data).toHaveLength(1);
    await service.from("connections").insert({ sender_id: A, receiver_id: id(5) });
  });

  it("the receiver can accept and decline", async () => {
    const { data } = await userA.from("connections").update({ status: "accepted" }).eq("sender_id", id(6)).eq("receiver_id", A).select("status");
    expect(data).toEqual([{ status: "accepted" }]);
    await service.from("connections").update({ status: "pending" }).eq("sender_id", id(6)).eq("receiver_id", A);
  });
});

describe("teams and applications", () => {
  it("you post teams as yourself, and nobody can edit or delete someone else's", async () => {
    await expectNoChange(["teams"], async () => {
      expectRefused(await userA.from("teams").insert({ owner_id: B, title: "Fake owner", roles: ["Backend"] }));
      await userA.from("teams").update({ title: "Hacked" }).eq("id", teamId(3));
      await userA.from("teams").delete().eq("id", teamId(3));
      await admin.from("teams").delete().eq("id", teamId(3));
    });
  });

  it("you apply as yourself, to a listed role, on someone else's team, as pending", async () => {
    await expectNoChange(["team_applications"], async () => {
      expectRefused(await userA.from("team_applications").insert({ team_id: teamId(3), user_id: id(19), role: "Frontend" }));
      expectRefused(await userA.from("team_applications").insert({ team_id: teamId(1), user_id: A, role: "Backend" })); // own team
      expectRefused(await userA.from("team_applications").insert({ team_id: teamId(3), user_id: A, role: "CEO" })); // not listed
      expectRefused(await userA.from("team_applications").insert({ team_id: teamId(3), user_id: A, role: "Frontend", status: "accepted" }));
    });
    const { data, error } = await userA.from("team_applications").insert({ team_id: teamId(3), user_id: A, role: "Frontend" }).select("id").single();
    expect(error).toBeNull();
    // ...and can withdraw it
    expect((await userA.from("team_applications").delete().eq("id", data?.id).select("id")).data).toHaveLength(1);
  });

  it("only the team's owner can accept or decline, and only the status changes", async () => {
    const pending = { team_id: teamId(3), user_id: id(9) };
    await expectNoChange(["team_applications"], async () => {
      await userA.from("team_applications").update({ status: "accepted" }).match(pending);
      await (await signInAs(9)).from("team_applications").update({ status: "accepted" }).match(pending); // the applicant
      await admin.from("team_applications").update({ status: "accepted" }).match(pending);
      expectRefused(await userB.from("team_applications").update({ role: "Backend" }).match(pending));
      expectRefused(await userB.from("team_applications").update({ user_id: A }).match(pending));
      expectRefused(await userB.from("team_applications").update({ team_id: teamId(1) }).match(pending));
    });
    const { data } = await userB.from("team_applications").update({ status: "accepted" }).match(pending).select("status");
    expect(data).toEqual([{ status: "accepted" }]);
    await service.from("team_applications").update({ status: "pending" }).match(pending);
  });

  it("nobody deletes someone else's application, not even the team owner", async () => {
    await expectNoChange(["team_applications"], async () => {
      await userA.from("team_applications").delete().eq("team_id", teamId(3));
      await userB.from("team_applications").delete().eq("team_id", teamId(3));
      await admin.from("team_applications").delete().eq("team_id", teamId(3));
    });
  });
});

describe("awards", () => {
  it("you add awards as yourself, with your own project and a team you were on", async () => {
    const theirProject = (await rows("projects", "id, user_id")).find((p) => p.user_id === B)?.id;
    const base = { placement: "Winner", event_name: "Test event", awarded_on: "2025-01-01" };
    await expectNoChange(["awards"], async () => {
      expectRefused(await userA.from("awards").insert({ ...base, user_id: B }));
      expectRefused(await userA.from("awards").insert({ ...base, user_id: A, project_id: theirProject }));
      expectRefused(await userA.from("awards").insert({ ...base, user_id: A, team_id: teamId(3) })); // not on it
      expectRefused(await userA.from("awards").insert({ ...base, user_id: A, team_id: teamId(6) })); // only pending
    });
    const { data, error } = await userA.from("awards").insert({ ...base, user_id: A, team_id: teamId(4) }).select("id").single();
    expect(error).toBeNull(); // accepted on team 4
    await service.from("awards").delete().eq("id", data?.id);
  });

  it("nobody can edit, delete or take over someone else's award, not even the admin", async () => {
    await expectNoChange(["awards"], async () => {
      await userA.from("awards").update({ placement: "Winner" }).eq("id", awardId(3));
      await admin.from("awards").update({ placement: "Winner" }).eq("id", awardId(3));
      await userA.from("awards").delete().eq("id", awardId(3));
      await admin.from("awards").delete().eq("id", awardId(3));
      await userB.from("awards").update({ user_id: B }).eq("id", awardId(1));
      expectRefused(await userA.from("awards").update({ user_id: B }).eq("id", awardId(1)));
    });
  });
});

describe("award teammates", () => {
  // Award 3 is B's; A's tag on it is pending and 09's is declined. Award 1 is A's; 03 confirmed, 04 pending, 05 declined.
  const aOnB = { award_id: awardId(3), user_id: A };

  it("the tagged person confirms or declines for themselves", async () => {
    const { data } = await userA.from("award_teammates").update({ status: "confirmed" }).match(aOnB).select("status");
    expect(data).toEqual([{ status: "confirmed" }]);
    await service.from("award_teammates").update({ status: "pending" }).match(aOnB);
  });

  it("nobody can confirm a tag for someone else: not the award's owner, another teammate or the admin", async () => {
    await expectNoChange(["award_teammates"], async () => {
      await userB.from("award_teammates").update({ status: "confirmed" }).match(aOnB);
      await admin.from("award_teammates").update({ status: "confirmed" }).match(aOnB);
      await (await signInAs(3)).from("award_teammates").update({ status: "confirmed" }).match({ award_id: awardId(1), user_id: id(4) });
      await userA.from("award_teammates").update({ status: "confirmed" }).match({ award_id: awardId(1), user_id: id(4) }); // A owns award 1
      await userA.from("award_teammates").update({ status: "confirmed" }).match({ award_id: awardId(3), user_id: id(9) });
    });
  });

  it("a tag can't be set back to pending, moved to another award or person", async () => {
    await expectNoChange(["award_teammates"], async () => {
      expectRefused(await userA.from("award_teammates").update({ status: "pending" }).match(aOnB));
      expectRefused(await userA.from("award_teammates").update({ award_id: awardId(1) }).match(aOnB));
      expectRefused(await userA.from("award_teammates").update({ user_id: B }).match(aOnB));
    });
  });

  it("only the owner tags, never themselves, and every tag starts pending", async () => {
    await expectNoChange(["award_teammates"], async () => {
      expectRefused(await userA.from("award_teammates").insert({ award_id: awardId(3), user_id: id(19) })); // B's award
      expectRefused(await userA.from("award_teammates").insert({ award_id: awardId(1), user_id: id(19), status: "confirmed" }));
      expectRefused(await userA.from("award_teammates").insert({ award_id: awardId(1), user_id: A }));
      expectRefused(await userB.from("award_teammates").insert({ award_id: awardId(3), user_id: id(9) })); // declined stays declined
    });
  });

  it("the owner can't untag someone who declined; nobody else can untag at all", async () => {
    await expectNoChange(["award_teammates"], async () => {
      await userB.from("award_teammates").delete().match({ award_id: awardId(3), user_id: id(9) });
      await userA.from("award_teammates").delete().match(aOnB); // the tagged person removes themselves: they decline instead
      await userA.from("award_teammates").delete().eq("award_id", awardId(3));
      await admin.from("award_teammates").delete().eq("award_id", awardId(3));
    });
  });

  it("changing the placement sends confirmed teammates back to pending and tells them", async () => {
    const before = await one("awards", { id: awardId(1) });
    const { error } = await userA.from("awards").update({ placement: "2nd" }).eq("id", awardId(1));
    expect(error).toBeNull();
    expect((await one("award_teammates", { award_id: awardId(1), user_id: id(3) })).status).toBe("pending");
    expect((await one("award_teammates", { award_id: awardId(1), user_id: id(5) })).status).toBe("declined");
    const { data: told } = await service.from("notifications").select("message").eq("user_id", id(3)).eq("type", "award_changed");
    expect(told?.some((n) => String(n.message).includes("2nd place"))).toBe(true);
    await service.from("awards").update({ placement: before.placement }).eq("id", awardId(1));
    await service.from("award_teammates").update({ status: "confirmed" }).match({ award_id: awardId(1), user_id: id(3) });
  });
});

describe("notifications", () => {
  it("only the database writes them, and you can only mark your own read", async () => {
    await expectNoChange(["notifications"], async () => {
      expectRefused(await userA.from("notifications").insert({ user_id: B, type: "connection_request", message: "Fake", link: "/people" }));
      expectRefused(await userA.from("notifications").insert({ user_id: A, type: "connection_request", message: "Fake", link: "/people" }));
      await userA.from("notifications").update({ read: true }).eq("user_id", B);
      await admin.from("notifications").update({ read: true }).eq("user_id", B);
      expectRefused(await userA.from("notifications").update({ message: "Changed", link: "/x" }).eq("user_id", A));
      expectRefused(await userA.from("notifications").update({ user_id: B }).eq("user_id", A));
      await userA.from("notifications").delete().eq("user_id", A);
      await userA.from("notifications").delete().eq("user_id", B);
    });
    const { data } = await userA.from("notifications").update({ read: true }).eq("user_id", A).select("id");
    expect(data?.length).toBeGreaterThan(0);
    await service.from("notifications").update({ read: false }).eq("user_id", A);
  });
});

describe("opportunities", () => {
  const base = { title: "A brand new test opportunity", type: "hackathon", url: "https://example.com/new-test", deadline: "2030-01-01" };

  it("you add them as yourself and live; only admins change the status", async () => {
    await expectNoChange(["opportunities"], async () => {
      expectRefused(await userA.from("opportunities").insert({ ...base, submitted_by: B }));
      expectRefused(await userA.from("opportunities").insert({ ...base, status: "hidden" }));
      await userA.from("opportunities").update({ status: "removed" }).eq("id", opportunityId(1));
      await userA.from("opportunities").update({ status: "live" }).eq("id", opportunityId(6));
      await userA.from("opportunities").delete().eq("id", opportunityId(2)); // 07's
    });
    const { data } = await admin.from("opportunities").update({ status: "live" }).eq("id", opportunityId(6)).select("status");
    expect(data).toEqual([{ status: "live" }]);
    await service.from("opportunities").update({ status: "hidden" }).eq("id", opportunityId(6));
  });

  it("rejects links that aren't http(s)", async () => {
    expectRefused(await userA.from("opportunities").insert({ ...base, url: "javascript:alert(1)//x.y" }));
  });

  it("reports and 'looking for a team' are only ever your own", async () => {
    await expectNoChange(["opportunity_reports", "opportunity_participants"], async () => {
      expectRefused(await userA.from("opportunity_reports").insert({ opportunity_id: opportunityId(1), user_id: B, reason: "fake" }));
      await userA.from("opportunity_reports").delete().eq("opportunity_id", opportunityId(6));
      expectRefused(await userA.from("opportunity_participants").insert({ opportunity_id: opportunityId(1), user_id: B }));
      await userA.from("opportunity_participants").delete().eq("user_id", id(5));
      await userA.from("opportunity_participants").update({ note: "Hacked" }).eq("user_id", id(5));
    });
  });
});

describe("admins", () => {
  it("nobody can make themselves an admin through the API", async () => {
    await expectNoChange(["admins"], async () => {
      expectRefused(await userA.from("admins").insert({ user_id: A }));
      await admin.from("admins").delete().eq("user_id", ADMIN);
    });
  });
});

describe("links stored on profiles, projects and awards", () => {
  it("only http(s) links are accepted", async () => {
    await expectNoChange(["profiles", "projects", "awards"], async () => {
      for (const column of ["github", "linkedin", "website"]) {
        expectRefused(await userA.from("profiles").update({ [column]: "javascript:alert(1)" }).eq("id", A));
        expectRefused(await userA.from("profiles").update({ [column]: "JAVASCRIPT:alert(1)//https://" }).eq("id", A));
      }
      expectRefused(await userA.from("projects").insert({ title: "x", user_id: A, url: "javascript:alert(1)" }));
      expectRefused(await userA.from("projects").insert({ title: "x", user_id: A, repo_url: "data:text/html,x" }));
      expectRefused(await userA.from("awards").update({ proof_url: "javascript:alert(1)" }).eq("id", awardId(1)));
    });
  });
});

afterAll(async () => {
  // Leftovers from a failed run would break the next one
  await service.from("projects").delete().in("title", ["Test project", "Mine", "x"]);
  await service.from("awards").delete().eq("event_name", "Test event");
});
