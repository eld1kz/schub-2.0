import { expect, test, type Page } from "@playwright/test";
import { id, service, signInAs } from "./auth";
import { pick } from "./combobox";

// The event page's action bar, entering a team, entry status and featured events (supabase/team-entries.sql).
// Opportunity 1 "Placeholder Hack Seoul 2027" is upcoming; 4 "Placeholder Hack 2025" ended long ago.
// Student 06 owns no team and isn't looking for a team for opportunity 1.
// Team 2 "Full Sample Team": owner 07 (Yuna), members 08 (Taeho, Backend) and 14 (ML), entered in opportunity 2.
// Team 1 "Open Placeholder Team" (owner 01, Backend and Designer open) and team 3 "Mock Team With Pending" are
// entered in opportunity 1.
const event = "00000000-0000-4000-9000-000000000001";
const winter = "00000000-0000-4000-9000-000000000002";
const grant = "00000000-0000-4000-9000-000000000003";
const ended = "00000000-0000-4000-9000-000000000004";
const team1 = "00000000-0000-4000-a000-000000000001";
const team2 = "00000000-0000-4000-a000-000000000002";
const team3 = "00000000-0000-4000-a000-000000000003";
const newTeam = "E2E Event Team";

test.afterAll(async () => {
  const db = service();
  await db.from("opportunity_participants").delete().eq("opportunity_id", event).eq("user_id", id(6));
  await db.from("teams").delete().eq("title", newTeam);
  await db.from("team_entries").delete().eq("team_id", team2).neq("opportunity_id", winter);
  await db.from("team_entries").update({ status: "going" }).eq("team_id", team2);
  await db.from("teams").update({ roles: ["Backend", "ML"], role_notes: {} }).eq("id", team2);
  await db.from("team_entries").update({ opportunity_id: event, status: "going" }).eq("team_id", team1);
  await db.from("team_entries").delete().eq("team_id", team3).eq("opportunity_id", ended);
  await db.from("opportunities").update({ featured: false }).eq("id", grant);
  await db.from("notifications").delete().eq("type", "team_entered");
});

const bar = (page: Page, title: string) => page.getByRole("region", { name: `What you can do about ${title}` });
const teamRow = (page: Page, title: string) => page.locator("#teams").getByRole("article").filter({ has: page.getByRole("heading", { name: title }) });

test("signed out, all three buttons go to sign-in and back", async ({ page }) => {
  await page.goto(`/opportunities/${event}`);
  const actions = bar(page, "Placeholder Hack Seoul 2027");
  const back = encodeURIComponent(`/opportunities/${event}`);
  await expect(actions.getByRole("link", { name: "Find a team" })).toHaveAttribute("href", `/login?next=${back}`);
  await expect(actions.getByRole("link", { name: "Create a team" })).toHaveAttribute("href", `/login?next=${encodeURIComponent(`/teams/new?opportunity=${event}`)}`);
  await expect(actions.getByRole("link", { name: "Enter your team" })).toHaveAttribute("href", `/login?next=${back}`);
});

test("Find a team says you're looking and scrolls to the teams; Leave undoes it", async ({ browser }) => {
  const context = await browser.newContext();
  await signInAs(context, 6);
  const page = await context.newPage();
  await page.goto(`/opportunities/${event}`);
  const actions = bar(page, "Placeholder Hack Seoul 2027");
  // You own no team, so there's nothing to enter
  await expect(actions.getByRole("button", { name: "Enter your team" })).toHaveCount(0);

  await actions.getByRole("button", { name: "Find a team" }).click();
  await expect(actions.getByText("You're looking for a team")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Teams recruiting/ })).toBeInViewport();
  await expect(actions.getByRole("button", { name: "Edit note" })).toBeVisible();
  const { data } = await service().from("opportunity_participants").select("note").eq("opportunity_id", event).eq("user_id", id(6));
  expect(data).toEqual([{ note: "" }]);

  await actions.getByRole("button", { name: "Leave" }).click();
  await expect(actions.getByRole("button", { name: "Find a team" })).toBeVisible();
  await context.close();
});

test("Create a team opens the form with the event picked; the new team is entered as going", async ({ browser }) => {
  const context = await browser.newContext();
  await signInAs(context, 6);
  const page = await context.newPage();
  await page.goto(`/opportunities/${event}`);
  await bar(page, "Placeholder Hack Seoul 2027").getByRole("link", { name: "Create a team" }).click();
  await expect(page).toHaveURL(`/teams/new?opportunity=${event}`);
  await expect(page.locator('input[name="opportunity_id"]')).toHaveValue(event);
  await expect(page.getByLabel("For an opportunity")).toHaveText("Placeholder Hack Seoul 2027");

  await page.getByLabel("What are you building?").fill(newTeam);
  await page.getByRole("button", { name: "Designer" }).click();
  await page.getByRole("button", { name: "Post team" }).click();
  await expect(page.getByRole("heading", { level: 1, name: newTeam })).toBeVisible();
  await expect(page.getByText("For Placeholder Hack Seoul 2027")).toBeVisible();
  const events = page.getByRole("group", { name: "Placeholder Hack Seoul 2027" });
  await expect(events.getByLabel(`Status of ${newTeam} for Placeholder Hack Seoul 2027`)).toHaveText("Going");

  // Back on the event page it's your team now, instead of "Enter your team"
  await page.goto(`/opportunities/${event}`);
  await expect(bar(page, "Placeholder Hack Seoul 2027").getByText(`Your team: ${newTeam}`)).toBeVisible();
  await context.close();
});

test("enter an existing team, adding an open role; members are notified and status changes show everywhere", async ({ browser }) => {
  const owner = await browser.newContext();
  const member = await browser.newContext();
  await signInAs(owner, 7);
  await signInAs(member, 8);
  const page = await owner.newPage();
  const taeho = await member.newPage();

  await page.goto(`/opportunities/${event}`);
  const actions = bar(page, "Placeholder Hack Seoul 2027");
  await actions.getByRole("button", { name: "Enter your team" }).click();
  const dialog = page.getByRole("dialog", { name: "Enter your team in Placeholder Hack Seoul 2027" });
  // Your only team that hasn't entered is picked already; its roles are all filled
  await expect(dialog.getByRole("radio", { name: /Full Sample Team/ })).toBeChecked();
  await expect(dialog.getByText("Filled, so they stay: Backend, ML")).toBeVisible();
  await dialog.getByRole("button", { name: "Designer" }).click();
  await dialog.getByRole("button", { name: "Enter team" }).click();
  await expect(dialog).toBeHidden();

  // The bar shows your team and its status; the team is listed with a Going label and the new open role
  await expect(actions.getByRole("button", { name: "Enter your team" })).toHaveCount(0);
  await expect(actions.getByText("Your team: Full Sample Team")).toBeVisible();
  const row = teamRow(page, "Full Sample Team");
  await expect(row.getByText("Going", { exact: true })).toBeVisible();
  await expect(row.getByRole("listitem").filter({ hasText: "Designer, open" })).toBeVisible();

  // Taeho hears about it
  await taeho.goto("/teams");
  await taeho.getByLabel(/^Notifications/).first().click();
  await expect(taeho.getByText("Your team entered Placeholder Hack Seoul 2027").first()).toBeVisible();

  // The owner moves it to Registered from the event page: the official page is linked, the row's label follows
  const status = actions.getByRole("combobox", { name: "Status of Full Sample Team for Placeholder Hack Seoul 2027", exact: true });
  await pick(status, "Registered");
  await expect(actions.getByRole("link", { name: "Official registration page ↗" })).toHaveAttribute("href", "https://example.com/hack-seoul-2027");
  await expect(row.getByText("Registered", { exact: true })).toBeVisible();
  await page.reload();
  await expect(status).toHaveText("Registered");

  // Then to Placed from the team page's Events, newest first, which links to adding the award
  await page.goto(`/teams/${team2}`);
  const events = page.locator("#events").getByRole("group");
  await expect(events.first()).toHaveAccessibleName("Placeholder Hack Seoul 2027");
  await expect(events.nth(1)).toHaveAccessibleName("Mock AI Challenge Winter");
  await pick(events.first().getByRole("combobox", { name: "Status of Full Sample Team for Placeholder Hack Seoul 2027", exact: true }), "Placed");
  await expect(events.first().getByRole("link", { name: "Add the award to your profile" })).toHaveAttribute("href", `/u/${id(7)}#awards`);

  // Members see the status, but can't change it
  await taeho.goto(`/teams/${team2}`);
  const theirs = taeho.locator("#events").getByRole("group", { name: "Placeholder Hack Seoul 2027" });
  await expect(theirs.getByText("Placed", { exact: true })).toBeVisible();
  await expect(theirs.getByRole("combobox")).toHaveCount(0);
  await owner.close();
  await member.close();
});

test("after an event, teams still only going drop off its list and stale open roles stop showing", async ({ browser }) => {
  const db = service();
  // Team 1 only ever said it was going to the ended event; team 3 submitted to it
  await db.from("team_entries").update({ opportunity_id: ended }).eq("team_id", team1);
  await db.from("team_entries").insert({ team_id: team3, opportunity_id: ended, status: "submitted" });
  const context = await browser.newContext();
  await signInAs(context, 6);
  const page = await context.newPage();

  await page.goto(`/opportunities/${ended}`);
  await expect(page.getByRole("heading", { name: /^Teams/ })).toHaveText("Teams1");
  await expect(teamRow(page, "Open Placeholder Team")).toHaveCount(0);
  const row = teamRow(page, "Mock Team With Pending");
  await expect(row.getByText("Submitted", { exact: true })).toBeVisible();
  await expect(row.getByText("Not recruiting: the event is over")).toBeVisible();
  await expect(row.getByRole("listitem").filter({ hasText: /, open$/ })).toHaveCount(0);
  // Nothing left to do about it
  await expect(bar(page, "Placeholder Hack 2025")).toHaveCount(0);

  // Team 1's only event is over: no open roles to apply for on its page or its row
  await page.goto(`/teams/${team1}`);
  await expect(page.getByText("Placeholder Hack 2025 is over, so the open roles aren't shown.")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Apply for/ })).toHaveCount(0);
  await page.goto("/teams");
  const listed = page.getByRole("main").getByRole("article").filter({ has: page.getByRole("heading", { name: "Open Placeholder Team" }) });
  await expect(listed.getByText("Not recruiting: the event is over")).toBeVisible();
  await context.close();
});

test("an admin features an event: it comes first on /opportunities with its buttons, and leads the landing page's Live block", async ({ browser }) => {
  const context = await browser.newContext();
  await signInAs(context, 20);
  const page = await context.newPage();
  await page.goto(`/opportunities/${grant}`);
  await page.getByRole("button", { name: "Feature this event" }).click();
  await expect(page.getByRole("button", { name: "Stop featuring" })).toBeVisible();

  await page.goto("/opportunities");
  const first = page.getByRole("main").getByRole("article").first();
  await expect(first.getByRole("link", { name: "Notreal Startup Grant" })).toBeVisible();
  await expect(first.getByText("Featured")).toBeVisible();
  const actions = bar(page, "Notreal Startup Grant");
  await expect(actions.getByRole("button", { name: "Find a team" })).toBeVisible();
  await expect(actions.getByRole("link", { name: "Create a team" })).toBeVisible();
  await context.close();

  // Signed out, on the landing page
  const visitor = await browser.newPage();
  await visitor.goto("/");
  const live = visitor.getByRole("region", { name: /Featured and soonest opportunities/ });
  await expect(live.getByRole("article").first().getByText("Featured")).toBeVisible();
  await expect(bar(visitor, "Notreal Startup Grant").getByRole("link", { name: "Enter your team" })).toBeVisible();
  await visitor.close();
});
