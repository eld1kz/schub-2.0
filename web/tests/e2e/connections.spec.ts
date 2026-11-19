import { expect, test } from "@playwright/test";
import { id, service, signInAs } from "./auth";

// Student 08 (Taeho) connects with 09 (Ara) and 10 (Minho); none of them are connected in the seed
test("connect, and the other person accepts", async ({ browser }) => {
  const sender = await browser.newContext();
  const receiver = await browser.newContext();
  await signInAs(sender, 8);
  await signInAs(receiver, 9);
  const senderPage = await sender.newPage();
  const receiverPage = await receiver.newPage();

  await senderPage.goto(`/u/${id(9)}`);
  await expect(senderPage.getByText("t.me/fake_student_9")).toBeHidden();
  // The profile's own button comes first; "People you may team up with" has more
  await senderPage.getByRole("button", { name: "Connect" }).first().click();
  await expect(senderPage.getByText("pending", { exact: true })).toBeVisible();

  await receiverPage.goto("/people/requests");
  await receiverPage.getByRole("article").filter({ hasText: "Taeho Stubbs" }).getByRole("button", { name: "Accept" }).click();
  await receiverPage.goto("/people/connections");
  await expect(receiverPage.getByRole("article").getByRole("link", { name: "Taeho Stubbs" })).toBeVisible();

  // Connected: contact details show both ways
  await senderPage.goto(`/u/${id(9)}`);
  await expect(senderPage.getByRole("link", { name: "t.me/fake_student_9" })).toBeVisible();
  await receiverPage.goto(`/u/${id(8)}`);
  await expect(receiverPage.getByRole("link", { name: "t.me/fake_student_8" })).toBeVisible();

  await sender.close();
  await receiver.close();
});

test("connect, then withdraw the request", async ({ context, page }) => {
  await signInAs(context, 8);
  await page.goto(`/u/${id(10)}`);
  await page.getByRole("button", { name: "Connect" }).first().click();
  await expect(page.getByText("pending", { exact: true })).toBeVisible();

  await page.goto("/people/requests");
  const request = page.getByRole("article").filter({ hasText: "Minho Ipsum" });
  await request.getByRole("button", { name: "Withdraw" }).click();
  await expect(request).toBeHidden();

  // They never got it: nothing waiting for them
  await page.goto(`/u/${id(10)}`);
  await expect(page.getByRole("button", { name: "Connect" }).first()).toBeVisible();
});

test("the Connect button says so when the daily cap is hit", async ({ context, page }) => {
  // Fill student 08's 20 requests for today with fresh people, then try one more from the page
  const admin = service();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin.from("connections").select("id", { count: "exact", head: true }).eq("sender_id", id(8)).gt("created_at", since);
  const extra: string[] = [];
  try {
    for (let i = 0; i < 20 - (count ?? 0); i++) {
      const { data } = await admin.auth.admin.createUser({ email: `cap-${crypto.randomUUID()}@schub.test`, email_confirm: true, user_metadata: { name: `Cap Person ${i}` } });
      if (!data.user) throw new Error("No user");
      extra.push(data.user.id);
      await admin.from("connections").insert({ sender_id: id(8), receiver_id: data.user.id });
    }
    await signInAs(context, 8);
    await page.goto(`/u/${id(19)}`);
    await page.getByRole("button", { name: "Connect" }).first().click();
    await expect(page.getByRole("alert").filter({ hasText: "You can send up to 20 connection requests a day." })).toBeVisible();
    expect((await admin.from("connections").select("id").eq("sender_id", id(8)).eq("receiver_id", id(19))).data).toEqual([]);
  } finally {
    for (const user of extra) await admin.auth.admin.deleteUser(user);
  }
});
