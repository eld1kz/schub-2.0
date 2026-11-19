// Photo uploads: the media bucket takes small images, and each user writes only to their own folder.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, B, guest, service, signInAs, signedOut, type Client } from "./helpers";

// The smallest valid PNG: 1x1, transparent
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const bucket = (client: Client) => client.storage.from("media");
const name = () => `test-${crypto.randomUUID()}.png`;

let userA: Client, userB: Client;
let theirs: string;

beforeAll(async () => {
  [userA, userB] = await Promise.all([signInAs(1), signInAs(2)]);
  theirs = `${B}/${name()}`;
  const { error } = await bucket(userB).upload(theirs, png, { contentType: "image/png" });
  if (error) throw error;
});

afterAll(async () => {
  for (const folder of [A, B]) {
    const { data } = await bucket(service).list(folder);
    const test = (data ?? []).filter((f) => f.name.startsWith("test-")).map((f) => `${folder}/${f.name}`);
    if (test.length) await bucket(service).remove(test);
  }
});

const exists = async (path: string) => {
  const [folder, file] = path.split("/");
  const { data } = await bucket(service).list(folder, { search: file });
  return (data ?? []).some((f) => f.name === file);
};

describe("media bucket", () => {
  it("you can upload an image to your own folder", async () => {
    const path = `${A}/${name()}`;
    expect((await bucket(userA).upload(path, png, { contentType: "image/png" })).error).toBeNull();
    expect(await exists(path)).toBe(true);
  });

  // Low: Storage needs a select policy to find a file before deleting it, and there is none, so the
  // "Users delete their own images" policy never takes effect. Replaced photos stay public for good.
  it.fails("KNOWN ISSUE (Low): you can delete your own image", async () => {
    const path = `${A}/${name()}`;
    await bucket(userA).upload(path, png, { contentType: "image/png" });
    await bucket(userA).remove([path]);
    expect(await exists(path)).toBe(false);
  });

  it("you can't upload into someone else's folder, or outside any folder", async () => {
    expect((await bucket(userA).upload(`${B}/${name()}`, png, { contentType: "image/png" })).error).not.toBeNull();
    expect((await bucket(userA).upload(name(), png, { contentType: "image/png" })).error).not.toBeNull();
    expect((await bucket(userA).upload(`${A}/../${B}/${name()}`, png, { contentType: "image/png" })).error).not.toBeNull();
  });

  it("you can't overwrite, move or delete someone else's file", async () => {
    expect((await bucket(userA).upload(theirs, png, { contentType: "image/png", upsert: true })).error).not.toBeNull();
    expect((await bucket(userA).update(theirs, png, { contentType: "image/png" })).error).not.toBeNull();
    await bucket(userA).move(theirs, `${A}/${name()}`);
    await bucket(userA).remove([theirs]);
    expect(await exists(theirs)).toBe(true);
  });

  it("only JPG, PNG and WebP are accepted, whatever the file is called", async () => {
    const html = Buffer.from("<script>alert(1)</script>");
    expect((await bucket(userA).upload(`${A}/${name()}`, html, { contentType: "text/html" })).error).not.toBeNull();
    expect((await bucket(userA).upload(`${A}/test-x.html`, html, { contentType: "text/html" })).error).not.toBeNull();
    expect((await bucket(userA).upload(`${A}/test-x.svg`, html, { contentType: "image/svg+xml" })).error).not.toBeNull();
  });

  it("files over 4 MB are refused", async () => {
    const big = Buffer.alloc(4 * 1024 * 1024 + 1);
    expect((await bucket(userA).upload(`${A}/${name()}`, big, { contentType: "image/png" })).error).not.toBeNull();
  });

  it("guests and signed-out visitors can't upload", async () => {
    const { client, userId } = await guest();
    expect((await bucket(client).upload(`${userId}/${name()}`, png, { contentType: "image/png" })).error).not.toBeNull();
    expect((await bucket(signedOut()).upload(`${A}/${name()}`, png, { contentType: "image/png" })).error).not.toBeNull();
  });
});
