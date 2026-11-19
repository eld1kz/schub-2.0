// supabase/account-photos.sql: the Google or GitHub account photo fills in a profile without an uploaded one
import { afterAll, describe, expect, it } from "vitest";
import { service, signedOut } from "./helpers";

const google = (n: number) => `https://lh3.googleusercontent.com/a/test-photo-${n}=s96-c`;
const github = (n: number) => `https://avatars.githubusercontent.com/u/${n}?v=4`;
const created: string[] = [];

async function newAccount(meta: Record<string, string>) {
  const { data, error } = await service.auth.admin.createUser({ email: `photo-${Date.now()}-${created.length}@schub.test`, email_confirm: true, user_metadata: meta });
  if (error || !data.user) throw error ?? new Error("No user");
  created.push(data.user.id);
  return data.user.id;
}

const avatar = async (id: string) => (await service.from("profiles").select("avatar_url").eq("id", id).single()).data?.avatar_url;
// What signing in again does: the provider's latest metadata replaces the old
const signInAgain = (id: string, meta: Record<string, string>) => service.auth.admin.updateUserById(id, { user_metadata: meta });

afterAll(async () => {
  for (const id of created) await service.auth.admin.deleteUser(id);
});

describe("account photos", () => {
  it("fill in a new account's photo, from avatar_url or picture", async () => {
    expect(await avatar(await newAccount({ name: "Photo One", avatar_url: google(1) }))).toBe(google(1));
    expect(await avatar(await newAccount({ name: "Photo Two", picture: google(2) }))).toBe(google(2));
  });

  it("fill in a new GitHub account's photo", async () => {
    expect(await avatar(await newAccount({ name: "Photo Gh", avatar_url: github(1) }))).toBe(github(1));
  });

  it("are only taken from Google's and GitHub's image hosts", async () => {
    expect(await avatar(await newAccount({ name: "Photo Three", avatar_url: "https://example.com/me.png" }))).toBe("");
    expect(await avatar(await newAccount({ name: "Photo Four", avatar_url: "https://lh3.googleusercontent.com.evil.com/x" }))).toBe("");
    expect(await avatar(await newAccount({ name: "Photo Four B", avatar_url: "https://avatars.githubusercontent.com.evil.com/u/1" }))).toBe("");
  });

  it("follow a newer Google photo, and fill in for an account that had none", async () => {
    const id = await newAccount({ name: "Photo Five", avatar_url: google(5) });
    await signInAgain(id, { name: "Photo Five", avatar_url: google(55) });
    expect(await avatar(id)).toBe(google(55));
    const plain = await newAccount({ name: "Photo Six" });
    expect(await avatar(plain)).toBe("");
    await signInAgain(plain, { name: "Photo Six", picture: google(6) });
    expect(await avatar(plain)).toBe(google(6));
  });

  it("follow the account signed in with last, Google or GitHub", async () => {
    const id = await newAccount({ name: "Photo Both", avatar_url: google(9) });
    await signInAgain(id, { name: "Photo Both", avatar_url: github(9) });
    expect(await avatar(id)).toBe(github(9));
  });

  it("never replace an uploaded photo", async () => {
    const id = await newAccount({ name: "Photo Seven", avatar_url: google(7) });
    const uploaded = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321"}/storage/v1/object/public/media/${id}/me.png`;
    await service.from("profiles").update({ avatar_url: uploaded }).eq("id", id);
    await signInAgain(id, { name: "Photo Seven", avatar_url: google(77) });
    expect(await avatar(id)).toBe(uploaded);
    await signInAgain(id, { name: "Photo Seven", avatar_url: github(77) });
    expect(await avatar(id)).toBe(uploaded);
  });

  it("the helpers aren't callable through the API", async () => {
    expect((await signedOut().rpc("account_photo", { meta: { avatar_url: google(8) } })).error).not.toBeNull();
    expect((await signedOut().rpc("is_account_photo", { url: google(8) })).error).not.toBeNull();
  });
});
