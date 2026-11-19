import { expect, test } from "@playwright/test";
import { id, signInAs } from "./auth";

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
