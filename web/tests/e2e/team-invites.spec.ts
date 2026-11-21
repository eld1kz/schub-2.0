import { expect, test } from "@playwright/test";
import { id, service, signInAs } from "./auth";

// Student 01 (Minji) owns team 1, "Open Placeholder Team" (Backend, Designer). Seeded wanted roles:
// 04 Seoyeon and 10 Minho want Designer, so they're suggested first for it.
const team = "00000000-0000-4000-a000-000000000001";

test.afterAll(async () => {
  await service().from("team_applications").delete().eq("team_id", team);
});

test("invite someone suggested for a role, withdraw, invite again; they accept from Your teams and join", async ({ browser }) => {
  const owner = await browser.newContext();
  const invitee = await browser.newContext();
  await signInAs(owner, 1);
  await signInAs(invitee, 10);
  const page = await owner.newPage();
  const them = await invitee.newPage();

  await page.goto(`/teams/${team}`);
  const designer = page.getByRole("group", { name: "Designer", exact: true });
  await expect(designer.getByText("People who fill this role")).toBeVisible();
  await expect(designer.getByText("Wants Designer").first()).toBeVisible();
  await designer.getByRole("button", { name: "Invite Minho Ipsum as Designer" }).click();
  await expect(designer.getByText("Invited")).toBeVisible();
  // Already invited: no longer suggested
  await expect(page.getByRole("button", { name: /Invite Minho Ipsum/ })).toHaveCount(0);

  // Withdraw, and Minho is suggested again
  await designer.getByRole("button", { name: "Withdraw" }).click();
  await expect(designer.getByRole("button", { name: "Invite Minho Ipsum as Designer" })).toBeVisible();
  await designer.getByRole("button", { name: "Invite Minho Ipsum as Designer" }).click();
  await expect(designer.getByText("Invited")).toBeVisible();

  // Minho sees it in Your teams > Invitations and accepts
  await them.goto("/teams/mine");
  const invitations = them.locator("section").filter({ has: them.getByRole("heading", { name: /Invitations/ }) });
  await expect(invitations.getByRole("link", { name: "Open Placeholder Team" })).toBeVisible();
  await expect(invitations.getByText("Invited by Minji Placeholder")).toBeVisible();
  await invitations.getByRole("button", { name: "Accept" }).click();
  const memberOf = them.locator("section").filter({ has: them.getByRole("heading", { name: /Member of/ }) });
  await expect(memberOf.getByRole("link", { name: "Open Placeholder Team" })).toBeVisible();

  // On the team page Designer is filled and Minho is a member
  await page.reload();
  const members = page.locator("section").filter({ has: page.getByRole("heading", { name: "Team", exact: true }) });
  await expect(members.getByRole("link", { name: "Minho Ipsum" })).toBeVisible();
  await expect(page.getByRole("button", { name: /as Designer$/ })).toHaveCount(0);

  await owner.close();
  await invitee.close();
});

test("an invited person sees the invite on the team page and can decline it there", async ({ browser }) => {
  await service().from("team_applications").delete().eq("team_id", team);
  await service().from("team_applications").insert({ team_id: team, user_id: id(4), role: "Designer", direction: "invite" });
  const invitee = await browser.newContext();
  await signInAs(invitee, 4);
  const page = await invitee.newPage();
  await page.goto(`/teams/${team}`);
  await expect(page.getByText("Minji Placeholder invited you to join as Designer.")).toBeVisible();
  await expect(page.getByText("You're invited")).toBeVisible();
  await page.getByRole("button", { name: "Decline" }).click();
  await expect(page.getByText("Minji Placeholder invited you to join as Designer.")).toHaveCount(0);
  const { data } = await service().from("team_applications").select("status").eq("team_id", team).eq("user_id", id(4)).single();
  expect(data?.status).toBe("declined");
  // Declining doesn't shut them out: they can still apply
  await page.reload();
  await expect(page.getByRole("button", { name: "Apply for this role" }).first()).toBeVisible();
  await invitee.close();
});
