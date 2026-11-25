// Guests (anonymous accounts the proxy creates) and signed-out visitors can't write anything.
import { beforeAll, describe, it } from "vitest";
import { expectNoChange, expectRefused, guest, signedOut, type Client } from "./helpers";
import { allTables, newRows, triesToWriteEverything } from "./write-everything";

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
