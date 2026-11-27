"use server";

import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, requireMember, requireUser } from "@/lib/supabase/server";
import { parseList } from "@/lib/match";
import { isEligibility, opportunityTypes } from "@/lib/opportunities";
import { isCountryCode } from "@/lib/countries";
import { foundDetails, readEventPage, type Prefill } from "@/lib/link-preview";
import { isEntryStatus, openRoles } from "@/lib/teams";
import { fetchPage, linkWorks } from "@/lib/link-check";
import { EXPERIENCE_DESCRIPTION_MAX, EXPERIENCE_TYPES, mediaPath, toLink } from "@/lib/portfolio";
import { AWARD_DESCRIPTION_MAX, AWARD_TEAMMATES_MAX, PLACEMENTS } from "@/lib/awards";
import { knownSkills } from "@/lib/skills";
import { knownGoals } from "@/lib/goals";
import { ROLES, knownRoles, rolesWithNotes } from "@/lib/roles";
import { HOURS, knownLanguages, oneOf, WORK_MODES } from "@/lib/languages";
import { LAST_METHOD_COOKIE, enabledMethods, type OAuthProvider } from "@/lib/auth-providers";
import { localPath } from "@/lib/redirect";
import { SHARED_PROJECT_PITCH_MAX, SHARED_PROJECT_RESULT_MAX, SHARED_PROJECT_TITLE_MAX } from "@/lib/shared-projects";
import { ADMIN_REASON_MAX, REPORT_NOTE_MAX, REPORT_REASONS, isReportKind, targetPath, type ReportKind } from "@/lib/reports";
import { adminAccess, requireAdmin } from "@/lib/admin";

// Where a provider or an email link sends people back to: /auth/callback, then `next`
async function callbackUrl(next: string) {
  const origin = (await headers()).get("origin") ?? "";
  return `${origin}/auth/callback?next=${encodeURIComponent(localPath(next))}`;
}

// Starts sign-in with a provider; /auth/callback brings people back to `next`
export async function signIn(provider: OAuthProvider, next: string) {
  const back = localPath(next);
  if (!enabledMethods().includes(provider)) redirect(`/login?error=1&next=${encodeURIComponent(back)}`);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: await callbackUrl(back) } });
  if (error || !data.url) redirect(`/login?error=1&next=${encodeURIComponent(back)}`);
  redirect(data.url);
}

export type EmailSignInState = { email?: string; sent?: string; error?: string };

// Emails a sign-in link; new addresses get an account (and onboarding) when they open it
export async function sendSignInLink(next: string, _prev: EmailSignInState, formData: FormData): Promise<EmailSignInState> {
  if (!enabledMethods().includes("email")) return { error: "Email sign-in isn't available yet." };
  const email = String(formData.get("email") ?? "").trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { email, error: "Enter a valid email address." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: await callbackUrl(next) } });
  if (error) return { email, error: error.status === 429 ? "Too many sign-in emails. Wait a minute and try again." : "Couldn't send the link. Try again." };
  return { sent: email };
}

// Back to /login, where the method used last (its cookie outlives the session) is marked
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type SearchResults = { people: { id: string; name: string }[]; teams: { id: string; title: string }[]; events: { id: string; title: string }[] };

// % and _ are wildcards in ilike; match them literally
const containing = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

// Nav search: people by name, teams and listed events by title, up to 5 of each. Signed-out visitors can search too.
// Nobody finds people or teams an admin hid (supabase/admin.sql).
export async function searchGlobal(query: string): Promise<SearchResults> {
  const { supabase } = await requireUser();
  const q = query.trim().slice(0, 50);
  if (q.length < 2) return { people: [], teams: [], events: [] };
  const pattern = containing(q);
  const [people, teams, events] = await Promise.all([
    supabase.from("profiles").select("id, name").ilike("name", pattern).is("hidden_at", null).order("name").limit(5),
    supabase.from("teams").select("id, title").ilike("title", pattern).is("hidden_at", null).order("created_at", { ascending: false }).limit(5),
    supabase.from("opportunities").select("id, title").eq("status", "live").eq("needs_review", false).ilike("title", pattern).order("created_at", { ascending: false }).limit(5),
  ]);
  return { people: people.data ?? [], teams: teams.data ?? [], events: events.data ?? [] };
}

// Notifications are written by database triggers (supabase/notifications.sql); here they're only read
export async function openNotification(id: string) {
  const { supabase, userId } = await requireMember();
  const { data } = await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", userId).select("type, link").maybeSingle();
  revalidatePath("/", "layout");
  // New applicants to your team are reviewed from Your teams; the stored link points at the team.
  // Invitations (team_invite) already link to Your teams.
  redirect(data?.type === "team_application" ? "/teams/mine" : (data?.link ?? "/"));
}

export async function markAllRead() {
  const { supabase, userId } = await requireMember();
  await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  revalidatePath("/", "layout");
}

export async function createPost(formData: FormData) {
  const { supabase, userId } = await requireMember();
  const content = String(formData.get("content")).trim();
  if (!content) return;
  await supabase.from("posts").insert({ author_id: userId, content });
  revalidatePath("/feed");
}

export async function createIdea(formData: FormData) {
  const { supabase, userId } = await requireMember();
  const title = String(formData.get("title")).trim();
  if (!title) return;
  await supabase.from("ideas").insert({
    author_id: userId,
    title,
    description: String(formData.get("description")).trim(),
    skills_needed: parseList(formData.get("skills_needed")),
    stage: String(formData.get("stage")),
  });
  revalidatePath("/feed");
}

type Supabase = Awaited<ReturnType<typeof requireMember>>["supabase"];

// Stores an uploaded image in the user's own folder of the public "media" bucket.
// Returns its address, null when no file was chosen, or an error to show.
async function uploadImage(supabase: Supabase, userId: string, file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return { url: null };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024) {
    return { error: "The image should be a JPG, PNG or WebP under 4 MB." };
  }
  const path = `${userId}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (error) return { error: "Couldn't upload the image. Try again." };
  return { url: supabase.storage.from("media").getPublicUrl(path).data.publicUrl };
}

// Deletes an image this user uploaded (a replaced photo, or a new one whose save failed).
// Anything else, like another folder or an outside link, is left alone.
async function removeImage(supabase: Supabase, userId: string, url: string | null | undefined) {
  const path = mediaPath(url);
  if (path?.startsWith(`${userId}/`)) await supabase.storage.from("media").remove([path]);
}

export type DeleteAccountState = { error?: string };

// Deletes your account for good (supabase/delete-account.sql has what happens to each table), then signs out
// and forgets the sign-in method, so nothing in this browser points at the account any more.
// Your photos and project images go first, through Storage: Supabase doesn't let SQL delete stored files.
export async function deleteAccount(_prev: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  if (formData.get("confirm") !== "DELETE") return { error: "Type DELETE to confirm." };
  const { supabase, userId } = await requireMember();
  // Logged with the step, so a failure in production says where it stopped
  const fail = (step: string, error: { message: string } | null) => {
    console.error(`deleteAccount: ${step} failed`, error?.message);
    return { error: "Couldn't delete your account. Try again." };
  };

  // Checked before any file is touched, so a refusal leaves everything as it was
  const { data: blocker, error: checkError } = await supabase.rpc("my_account_deletion_blocker");
  if (checkError) return fail("check", checkError);
  if (blocker) return { error: blocker as string };

  // Projects of teams you own stay with the team when it's handed over, but their images are in your folder
  // and go below, so they're cleared first instead of left broken (supabase/shared-projects.sql)
  const { data: owned } = await supabase.from("teams").select("id").eq("owner_id", userId);
  if (owned?.length) {
    const { error: clearError } = await supabase.from("team_projects").update({ image_url: "" }).in("team_id", owned.map((t) => t.id)).neq("image_url", "");
    if (clearError) return fail("clearing project images", clearError);
  }

  const bucket = supabase.storage.from("media");
  // A page of files at a time, until the folder is empty (bounded, in case a listing never empties)
  for (let page = 0; page < 50; page++) {
    const { data: files, error } = await bucket.list(userId, { limit: 100 });
    if (error) return fail("listing files", error);
    if (!files?.length) break;
    const { error: removeError } = await bucket.remove(files.map((f) => `${userId}/${f.name}`));
    if (removeError) return fail("removing files", removeError);
  }

  const { error } = await supabase.rpc("delete_my_account");
  // The function's own refusals are written for people; anything else isn't
  if (error) return error.code === "P0001" ? { error: error.message } : fail("delete_my_account", error);

  // The account is gone, so only this browser's session is left to clear
  await supabase.auth.signOut({ scope: "local" });
  (await cookies()).delete(LAST_METHOD_COOKIE);
  redirect("/?deleted=1");
}

// Profile sections are edited one at a time from the profile page. Each action saves only its own
// fields and returns an error to show in the form, or nothing when it worked.
// `field` names the form field the error belongs to, so the form can show it there.
export type SaveResult = { error?: string; field?: string };

const saveFailed = "Couldn't save. Check the fields and try again.";
const field = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

async function updateMyProfile(fields: Record<string, unknown>): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  const { error } = await supabase.from("profiles").update(fields).eq("id", userId);
  if (error) return { error: saveFailed };
  revalidatePath("/", "layout");
  return {};
}

export async function saveHero(formData: FormData): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  if (!field(formData, "name")) return { error: "Add your name." };
  const photo = await uploadImage(supabase, userId, formData.get("photo"));
  if (photo.error) return { error: photo.error };
  const { data: before } = await supabase.from("profiles").select("avatar_url").eq("id", userId).single();
  const result = await updateMyProfile({
    name: field(formData, "name"),
    headline: field(formData, "headline"),
    university: field(formData, "university"),
    graduation_year: Number(formData.get("graduation_year")) || 0,
    open_to_collaborate: formData.get("open_to_collaborate") === "on",
    // Only roles from the fixed list (lib/roles.ts)
    wanted_roles: knownRoles(formData.getAll("wanted_roles")),
    // Work style: fixed lists (lib/languages.ts), and a short city
    languages: knownLanguages(formData.getAll("languages")),
    hours_per_week: oneOf(HOURS, formData.get("hours_per_week")),
    work_mode: oneOf(WORK_MODES, formData.get("work_mode")),
    city: field(formData, "city").slice(0, 60),
    // Only replace the photo when a new one was chosen
    ...(photo.url ? { avatar_url: photo.url } : {}),
  });
  // Keep exactly one photo: the old one goes once the new one is saved, the new one if saving failed
  if (photo.url) await removeImage(supabase, userId, result.error ? photo.url : before?.avatar_url);
  return result;
}

// The one-tap switch in your profile hero
export async function setOpenToTeam(open: boolean) {
  await updateMyProfile({ open_to_collaborate: open === true });
}

export async function saveAbout(formData: FormData): Promise<SaveResult> {
  return updateMyProfile({ bio: field(formData, "bio") });
}

export async function saveSkills(formData: FormData): Promise<SaveResult> {
  // Only skills from the fixed list are kept
  return updateMyProfile({ skills: knownSkills(formData.getAll("skills")) });
}

export async function saveInterests(formData: FormData): Promise<SaveResult> {
  return updateMyProfile({
    goals: knownGoals(formData.getAll("goals")),
    interests: parseList(formData.get("interests")),
    looking_for: parseList(formData.get("looking_for")),
  });
}

export async function saveLinks(formData: FormData): Promise<SaveResult> {
  return updateMyProfile({
    github: toLink(field(formData, "github"), "https://github.com/"),
    linkedin: toLink(field(formData, "linkedin"), "https://www.linkedin.com/in/"),
    website: toLink(field(formData, "website")),
  });
}

export async function saveContact(formData: FormData): Promise<SaveResult> {
  return updateMyProfile({
    // Stored as a bare username: "@name" and "https://t.me/name" both become "name"
    telegram: field(formData, "telegram").replace(/^(https?:\/\/)?(t\.me\/)?@?/i, ""),
    email: field(formData, "email"),
  });
}

// The three onboarding steps, saved together
export async function completeOnboarding(formData: FormData) {
  const { supabase, userId } = await requireMember();
  // Only asked for when the account has no name yet (email sign-ups); never overwrites one
  const { data: me } = await supabase.from("profiles").select("name").eq("id", userId).single();
  const needsName = !me?.name.trim();
  const name = field(formData, "name");
  if (needsName && !name) redirect(`/onboarding?error=${encodeURIComponent("Add your name.")}`);
  if (name.length > 80) redirect(`/onboarding?error=${encodeURIComponent("Keep your name to 80 characters or fewer.")}`);
  const university = String(formData.get("university") ?? "").trim();
  const skills = knownSkills(formData.getAll("skills"));
  if (!university || skills.length === 0) redirect(`/onboarding?error=${encodeURIComponent("Add your university and at least one skill.")}`);
  const year = Number(formData.get("graduation_year"));

  const { error } = await supabase
    .from("profiles")
    .update({
      ...(needsName ? { name } : {}),
      university,
      skills,
      goals: knownGoals(formData.getAll("goals")),
      // Optional on the first step
      languages: knownLanguages(formData.getAll("languages")),
      ...(year >= 2025 && year <= 2030 ? { graduation_year: year } : {}),
    })
    .eq("id", userId);
  if (error) redirect(`/onboarding?error=${encodeURIComponent("Couldn't save. Try again.")}`);
  revalidatePath("/", "layout");
  redirect("/opportunities");
}

// `id` is null for a new project
export async function saveProject(id: string | null, formData: FormData): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  const text = (key: string) => field(formData, key);

  const image = await uploadImage(supabase, userId, formData.get("image"));
  if (image.error) return { error: image.error };
  const fields = {
    title: text("title"),
    tagline: text("tagline"),
    description: text("description"),
    role: text("role"),
    built_at: text("built_at"),
    result: text("result"),
    year: Number(formData.get("year")) || null,
    url: toLink(text("url")),
    repo_url: toLink(text("repo_url")),
    skills: knownSkills(formData.getAll("skills")),
    ...(image.url ? { image_url: image.url } : {}),
  };
  const { data: before } = id ? await supabase.from("projects").select("image_url").eq("id", id).eq("user_id", userId).maybeSingle() : { data: null };
  const { error } = id
    ? await supabase.from("projects").update(fields).eq("id", id).eq("user_id", userId)
    : await supabase.from("projects").insert({ ...fields, user_id: userId });
  // Keep exactly one image: the old one goes once the new one is saved, the new one if saving failed
  if (image.url) await removeImage(supabase, userId, error ? image.url : before?.image_url);
  if (error) return { error: "Couldn't save the project. Check the fields and try again." };
  revalidatePath("/", "layout");
  return {};
}

export async function deleteProject(id: string): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  const { data: deleted, error } = await supabase.from("projects").delete().eq("id", id).eq("user_id", userId).select("image_url").maybeSingle();
  if (error) return { error: "Couldn't delete the project. Try again." };
  await removeImage(supabase, userId, deleted?.image_url);
  revalidatePath("/", "layout");
  return {};
}

// `id` is null for a new entry. Months arrive as "2026-03" and are stored as the first day of that month.
export async function saveExperience(id: string | null, formData: FormData): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  const text = (key: string) => field(formData, key);
  const day = (key: string) => (/^\d{4}-\d{2}$/.test(text(key)) ? `${text(key)}-01` : null);

  const start = day("start");
  const current = formData.get("current") === "on";
  const end = current ? null : day("end");
  if (!text("role")) return { error: "Add a title.", field: "role" };
  if (!text("company")) return { error: "Add the organization.", field: "company" };
  if (!start) return { error: "Pick the month and year it started.", field: "start" };
  if (!current && !end) return { error: "Pick the month and year it ended.", field: "end" };
  if (text("description").length > EXPERIENCE_DESCRIPTION_MAX) return { error: `Keep it to ${EXPERIENCE_DESCRIPTION_MAX} characters or fewer.`, field: "description" };
  const fields = {
    role: text("role"),
    company: text("company"),
    type: EXPERIENCE_TYPES.includes(text("type")) ? text("type") : "",
    location: text("location").slice(0, 80),
    remote: formData.get("remote") === "on",
    start_date: start,
    end_date: end,
    description: text("description"),
    skills: knownSkills(formData.getAll("skills")).slice(0, 20),
  };
  const { error } = id
    ? await supabase.from("experiences").update(fields).eq("id", id).eq("user_id", userId)
    : await supabase.from("experiences").insert({ ...fields, user_id: userId });
  if (error) return error.code === "23514" ? { error: "The end can't be before the start.", field: "end" } : { error: "Couldn't save it. Check the fields and try again." };
  revalidatePath("/", "layout");
  return {};
}

export async function deleteExperience(id: string): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  const { error } = await supabase.from("experiences").delete().eq("id", id).eq("user_id", userId);
  if (error) return { error: "Couldn't delete it. Try again." };
  revalidatePath("/", "layout");
  return {};
}

export type PersonResult = { id: string; name: string; avatar_url: string; headline: string };

// Teammate search in the award form: your connections and teammates by name, up to 6.
// Only they can be tagged (supabase/notification-limits.sql).
export async function searchPeople(query: string): Promise<PersonResult[]> {
  const { supabase } = await requireMember();
  const q = query.trim().slice(0, 50);
  if (q.length < 2) return [];
  const { data: candidates } = await supabase.rpc("tag_candidates");
  const ids = ((candidates ?? []) as { id: string }[]).map((c) => c.id);
  const { data } = await supabase.from("profiles").select("id, name, avatar_url, headline").ilike("name", containing(q)).in("id", ids).order("name").limit(6);
  return data ?? [];
}

// `id` is null for a new award. The month arrives as "2026-03" and is stored as its 1st day.
// Each "teammates" value is a person to tag: new ones are tagged (a trigger notifies them), ones left out are
// untagged. People who declined stay declined, so they can't be tagged again (supabase/awards.sql).
export async function saveAward(id: string | null, formData: FormData): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  const text = (key: string) => field(formData, key);
  const opportunityId = text("opportunity_id");
  const month = text("awarded_on");
  const teammates = [...new Set(formData.getAll("teammates").map(String))].filter((t) => t && t !== userId);

  if (!PLACEMENTS.includes(text("placement"))) return { error: "Choose a placement.", field: "placement" };
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Pick the month and year.", field: "awarded_on" };
  if (month > new Date().toISOString().slice(0, 7)) return { error: "Pick a month that has already passed.", field: "awarded_on" };
  if (text("description").length > AWARD_DESCRIPTION_MAX) return { error: `Keep it to ${AWARD_DESCRIPTION_MAX} characters or fewer.`, field: "description" };
  if (teammates.length > AWARD_TEAMMATES_MAX) return { error: `Tag up to ${AWARD_TEAMMATES_MAX} teammates.`, field: "teammates" };

  // A Schub opportunity lends its title, and a team you were on that entered it (started or accepted to) is linked
  let eventName = text("event_name");
  let teamId: string | null = null;
  if (opportunityId) {
    const [opportunity, owned, joined] = await Promise.all([
      supabase.from("opportunities").select("title").eq("id", opportunityId).maybeSingle(),
      supabase.from("team_entries").select("team_id, team:teams!inner(owner_id)").eq("opportunity_id", opportunityId).eq("team.owner_id", userId).limit(1),
      supabase.from("team_applications").select("team_id, team:teams!inner(team_entries!inner(opportunity_id))").eq("user_id", userId).eq("status", "accepted").eq("team.team_entries.opportunity_id", opportunityId).limit(1),
    ]);
    if (!opportunity.data) return { error: "That opportunity isn't listed any more. Type the event name instead.", field: "event" };
    eventName = opportunity.data.title;
    teamId = owned.data?.[0]?.team_id ?? joined.data?.[0]?.team_id ?? null;
  }
  if (!eventName) return { error: "Choose the event or type its name.", field: "event" };

  const fields = {
    placement: text("placement"),
    prize_name: text("prize_name").slice(0, 100),
    opportunity_id: opportunityId || null,
    event_name: eventName.slice(0, 200),
    awarded_on: `${month}-01`,
    project_id: text("project_id") || null,
    team_id: teamId,
    proof_url: toLink(text("proof_url")),
    description: text("description"),
  };
  const { data: award, error } = id
    ? await supabase.from("awards").update(fields).eq("id", id).eq("user_id", userId).select("id").single()
    : await supabase.from("awards").insert({ ...fields, user_id: userId }).select("id").single();
  if (error || !award) return { error: "Couldn't save the award. Check the fields and try again." };

  const { data: tagged } = await supabase.from("award_teammates").select("user_id, status").eq("award_id", award.id);
  const existing = tagged ?? [];
  const untag = existing.filter((t) => t.status !== "declined" && !teammates.includes(t.user_id)).map((t) => t.user_id);
  const tag = teammates.filter((t) => !existing.some((e) => e.user_id === t));
  const [untagged, added] = await Promise.all([
    untag.length > 0 ? supabase.from("award_teammates").delete().eq("award_id", award.id).in("user_id", untag) : { error: null },
    tag.length > 0 ? supabase.from("award_teammates").insert(tag.map((user_id) => ({ award_id: award.id, user_id }))) : { error: null },
  ]);
  if (untagged.error || added.error) {
    // A new award comes out again, so saving once more doesn't add it twice
    if (!id) await supabase.from("awards").delete().eq("id", award.id);
    // Refused by the tag policy or the daily cap (supabase/notification-limits.sql)
    const message =
      added.error?.code === "42501" ? "You can only tag your connections and teammates."
      : added.error?.message.includes("a day") ? added.error.message
      : "Couldn't tag the teammates. Try again.";
    return { error: message, field: "teammates" };
  }
  revalidatePath("/", "layout");
  return {};
}

export async function deleteAward(id: string): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  const { error } = await supabase.from("awards").delete().eq("id", id).eq("user_id", userId);
  if (error) return { error: "Couldn't delete the award. Try again." };
  revalidatePath("/", "layout");
  return {};
}

// A tagged teammate confirms or declines. Removing yourself from a confirmed award later is declining it.
export async function answerAwardTag(awardId: string, status: "confirmed" | "declined") {
  const { supabase, userId } = await requireMember();
  if (status !== "confirmed" && status !== "declined") return;
  await supabase.from("award_teammates").update({ status }).eq("award_id", awardId).eq("user_id", userId);
  revalidatePath("/", "layout");
}

// Used with useActionState (connect-button.tsx): returns a message to show when the request wasn't sent
export async function connect(receiverId: string): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  // If they already asked you, connecting back accepts their request instead of creating a second one
  const { data: theirs } = await supabase.from("connections").select("id").eq("sender_id", receiverId).eq("receiver_id", userId).maybeSingle();
  if (theirs) await supabase.from("connections").update({ status: "accepted" }).eq("id", theirs.id).eq("status", "pending");
  else {
    const { error } = await supabase.from("connections").insert({ sender_id: userId, receiver_id: receiverId });
    // The daily cap (supabase/notification-limits.sql)
    if (error) return { error: error.message.includes("a day") ? error.message : "Couldn't send the request. Try again." };
  }
  revalidatePath("/", "layout");
  return {};
}

// Server actions can be called with any arguments, so the status is checked here too
export async function respond(connectionId: string, status: "accepted" | "declined"): Promise<SaveResult> {
  const { supabase } = await requireMember();
  if (status !== "accepted" && status !== "declined") return {};
  const { data, error } = await supabase.from("connections").update({ status }).eq("id", connectionId).select("id");
  revalidatePath("/", "layout");
  // No rows: they withdrew it meanwhile
  return error || !data?.length ? { error: "Couldn't answer the request. Try again." } : {};
}

// The sender takes back a request the other person hasn't answered yet (policy in supabase/people-requests.sql)
export async function withdrawRequest(connectionId: string) {
  const { supabase, userId } = await requireMember();
  await supabase.from("connections").delete().eq("id", connectionId).eq("sender_id", userId).eq("status", "pending");
  revalidatePath("/", "layout");
}

type OpportunityFields = {
  title: string; type: string; url: string; organizer: string; city: string; country: string | null; online: boolean;
  languages: string[]; eligibility: string; eligibility_note: string;
  starts_at: string | null; deadline: string | null; ends_at: string | null; description: string;
};

// The opportunity form's fields, checked in the order the form shows them, or the first problem and its field
async function opportunityFields(formData: FormData): Promise<{ fields: OpportunityFields } | { error: string; field?: string }> {
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const day = (key: string) => (/^\d{4}-\d{2}-\d{2}$/.test(text(key)) ? text(key) : null);

  const deadline = day("deadline");
  const startsAt = day("starts_at");
  const endsAt = day("ends_at");
  const country = isCountryCode(text("country")) ? text("country") : null;
  const eligibility = isEligibility(text("eligibility")) ? text("eligibility") : "anyone";
  if (text("title").length < 3) return { error: "Add a title of at least 3 characters.", field: "title" };
  if (!(text("type") in opportunityTypes)) return { error: "Choose a type.", field: "type" };
  if (eligibility === "country" && !country) return { error: "Pick the country it's limited to.", field: "country" };
  if (deadline && startsAt && deadline > startsAt) return { error: "The deadline should be on or before the start.", field: "deadline" };
  const begins = startsAt ?? deadline;
  if (endsAt && begins && endsAt < begins) return { error: "The end can't be before the start.", field: "ends_at" };
  const url = text("url");
  if (!(await linkWorks(url))) return { error: "That link doesn't open. Check it and try again.", field: "url" };

  return {
    fields: {
      title: text("title"),
      type: text("type"),
      url,
      organizer: text("organizer"),
      city: text("city").slice(0, 80),
      country,
      online: formData.get("online") === "on",
      languages: knownLanguages(formData.getAll("languages")),
      eligibility,
      eligibility_note: eligibility === "anyone" ? "" : text("eligibility_note").slice(0, 300),
      starts_at: startsAt,
      deadline,
      ends_at: endsAt,
      description: text("description"),
    },
  };
}

// What the database says when it refuses an opportunity, as a message under the field it's about
function opportunityError(error: { code?: string; message: string }, deadline: string | null): SaveResult {
  const message = error.message;
  if (error.code === "23505") return { error: "This link is already listed.", field: "url" };
  if (message.includes("ends_after_start")) return { error: "The end can't be before the start.", field: "ends_at" };
  if (message.includes("deadline_before_start")) return { error: "The deadline should be on or before the start.", field: "deadline" };
  // Raised by check_new_opportunity() in supabase/opportunities.sql
  if (message.includes("similar opportunity")) return { error: message, field: "title" };
  if (message.includes("in the past")) return { error: message, field: deadline ? "deadline" : "starts_at" };
  if (message.includes("a day")) return { error: message };
  return { error: "Couldn't save it. Try again." };
}

// Errors come back with the field they belong to, so the form can show them there. Success opens the new page.
export async function addOpportunity(formData: FormData): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  const checked = await opportunityFields(formData);
  if ("error" in checked) return checked;

  const { data, error } = await supabase
    .from("opportunities")
    .insert({ ...checked.fields, submitted_by: userId })
    .select("id")
    .single();
  if (error || !data) return error ? opportunityError(error, checked.fields.deadline) : { error: "Couldn't add it. Try again." };
  revalidatePath("/opportunities");
  redirect(`/opportunities/${data.id}`);
}

// Admins fix an opportunity (/admin/events/[id]), often an import waiting for review. Saving counts as reviewing
// it: it goes live, and the importer stops overwriting it. Through admin_edit_event, which logs the change
// (supabase/admin.sql).
export async function updateOpportunity(id: string, formData: FormData): Promise<SaveResult> {
  const { supabase } = await requireAdmin();
  const checked = await opportunityFields(formData);
  if ("error" in checked) return checked;
  const { error } = await supabase.rpc("admin_edit_event", { event: id, fields: checked.fields });
  if (error) return error.code === "22023" || error.code === "P0002" ? { error: error.message } : opportunityError(error, checked.fields.deadline);
  revalidatePath("/", "layout");
  redirect("/admin/events");
}

// Imports waiting for review (/admin/imports): approving puts it on the lists; rejecting removes it for good (with a
// reason), and the importer won't bring it back. Both logged (admin_review_import in supabase/admin.sql).
export async function approveImport(id: string) {
  await requireAdmin();
  await adminCall("admin_review_import", { event: id, decision: "approve", reason: "" });
}

export async function rejectImport(id: string, _prev: SaveResult, formData: FormData): Promise<SaveResult> {
  await requireAdmin();
  const { reason, error, field } = reasonOf(formData, true);
  if (error) return { error, field };
  return adminCall("admin_review_import", { event: id, decision: "reject", reason });
}

export type LinkFill = { prefill?: Prefill; error?: string };

// "Fill from link" on /opportunities/new: reads one event page with the same protections as the link check and
// returns what it says, for the person to check. 20 an hour each (supabase/opportunity-engine.sql).
export async function fillFromLink(url: string): Promise<LinkFill> {
  const { supabase } = await requireMember();
  const link = URL.parse(String(url).trim());
  if (!link || !/^https?:$/.test(link.protocol)) return { error: "Paste the event's full link, starting with https://." };

  const { error } = await supabase.from("link_fetches").insert({});
  if (error) return { error: error.message.includes("an hour") ? error.message : "Couldn't read that page. Try again." };

  // Tests only: dev:local serves sample event pages from LINK_PREVIEW_FIXTURES (tests/e2e/fixtures), a local address
  // the safe fetch refuses. Never in production builds.
  const fixtures = process.env.NODE_ENV === "development" ? process.env.LINK_PREVIEW_FIXTURES : undefined;
  const html = fixtures && link.origin === fixtures ? await fetch(link).then((r) => r.text()) : await fetchPage(link.href);
  if (html === null) return { error: "Couldn't open that page. Check the link, or fill the form in yourself." };
  const prefill = readEventPage(html);
  if (!prefill.title && !foundDetails(prefill)) return { error: "That page doesn't describe an event we can read. Fill the form in yourself." };
  return { prefill };
}

export async function deleteOpportunity(id: string) {
  const { supabase } = await requireMember();
  await supabase.from("opportunities").delete().eq("id", id);
  revalidatePath("/opportunities");
  redirect("/opportunities");
}

// "Report" on a profile, team or event page. The database refuses yourself, your own team, and a second report
// of the same thing; 3 open reports hide an event until an admin looks (supabase/admin.sql).
export async function report(kind: ReportKind, targetId: string, formData: FormData) {
  const { supabase } = await requireMember();
  const reason = field(formData, "reason");
  if (!isReportKind(kind) || !(reason in REPORT_REASONS[kind])) return;
  await supabase.from("reports").insert({ target_type: kind, target_id: targetId, reason, note: field(formData, "note").slice(0, REPORT_NOTE_MAX) });
  revalidatePath(targetPath(kind, targetId));
}

// Joins, or updates your note when you've already joined
export async function lookForTeam(opportunityId: string, formData: FormData): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  const { error } = await supabase.from("opportunity_participants").upsert({
    opportunity_id: opportunityId,
    user_id: userId,
    note: String(formData.get("note") ?? "").trim(),
  });
  if (error) return { error: error.code === "23514" ? "Keep the note to 300 characters." : "Couldn't save it. Try again.", field: error.code === "23514" ? "note" : undefined };
  revalidatePath(`/opportunities/${opportunityId}`);
  return {};
}

// "Find a team": says you're looking for a team for this event, keeping your note if you already were
export async function findTeam(opportunityId: string): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  const { error } = await supabase
    .from("opportunity_participants")
    .upsert({ opportunity_id: opportunityId, user_id: userId }, { onConflict: "opportunity_id,user_id", ignoreDuplicates: true });
  if (error) return { error: "Couldn't add you. Try again." };
  revalidatePath("/opportunities", "layout");
  return {};
}

export async function stopLooking(opportunityId: string) {
  const { supabase, userId } = await requireMember();
  await supabase.from("opportunity_participants").delete().eq("opportunity_id", opportunityId).eq("user_id", userId);
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function createTeam(formData: FormData) {
  const { supabase, userId } = await requireMember();
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const fail = (message: string): never => redirect(`/teams/new?error=${encodeURIComponent(message)}`);

  // One "roles" value per picked role from the fixed list (lib/roles.ts), each with its "role_notes" value
  const { roles: unique, notes } = rolesWithNotes(formData.getAll("roles"), formData.getAll("role_notes"));
  if (unique.length === 0) fail("Pick at least one open role.");
  if (unique.length > 10) fail("Pick up to 10 roles.");

  const { data, error } = await supabase
    .from("teams")
    .insert({
      owner_id: userId,
      title: text("title"),
      description: text("description"),
      roles: unique,
      role_notes: notes,
      languages: knownLanguages(formData.getAll("languages")),
      work_mode: oneOf(WORK_MODES, formData.get("work_mode")),
    })
    .select("id")
    .single();
  if (error || !data) return fail(error?.code === "23514" ? "The name should be 3 to 120 characters." : "Couldn't post the team. Try again.");
  // The event it's for becomes its first entry (supabase/team-entries.sql)
  const opportunityId = text("opportunity_id");
  if (opportunityId) {
    const { error: entryError } = await supabase.from("team_entries").insert({ team_id: data.id, opportunity_id: opportunityId });
    if (entryError) {
      await supabase.from("teams").delete().eq("id", data.id);
      return fail("That event isn't taking teams any more. Pick another one.");
    }
  }
  revalidatePath("/", "layout");
  redirect(`/teams/${data.id}`);
}

// The owner edits the team from its page. Roles someone was accepted for stay, whatever the form sends; removing
// any other role declines its pending applications and invites (supabase/team-edit.sql).
export async function updateTeam(teamId: string, formData: FormData): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  const title = field(formData, "title");
  if (title.length < 3 || title.length > 120) return { error: "The name should be 3 to 120 characters.", field: "title" };
  const { data } = await supabase.from("teams").select("owner_id, roles, team_applications(role, status)").eq("id", teamId).maybeSingle();
  const team = data as { owner_id: string; roles: string[]; team_applications: { role: string; status: string }[] } | null;
  if (!team || team.owner_id !== userId) return { error: "Only the team's owner can edit it." };

  const open = openRoles(team);
  const picked = rolesWithNotes(formData.getAll("roles"), formData.getAll("role_notes"), team.roles);
  const roles = [...picked.roles, ...team.roles.filter((r) => !open.includes(r) && !picked.roles.includes(r))];
  if (roles.length === 0) return { error: "Pick at least one open role.", field: "roles" };
  if (roles.length > 10) return { error: "A team can list up to 10 roles.", field: "roles" };

  const { error } = await supabase
    .from("teams")
    .update({
      title,
      description: field(formData, "description"),
      roles,
      role_notes: picked.notes,
      languages: knownLanguages(formData.getAll("languages")),
      work_mode: oneOf(WORK_MODES, formData.get("work_mode")),
    })
    .eq("id", teamId);
  if (error) return { error: saveFailed };
  revalidatePath("/", "layout");
  return {};
}

// "Enter your team": enters one of your teams in an event; members are notified by a trigger
// (supabase/team-entries.sql). The "roles" values are the open roles as adjusted in the form; roles someone was
// accepted for always stay, and their notes stay with them.
export async function enterTeam(opportunityId: string, formData: FormData): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  const teamId = field(formData, "team_id");
  if (!teamId) return { error: "Choose a team.", field: "team_id" };
  const { data } = await supabase.from("teams").select("owner_id, roles, role_notes, team_applications(role, status)").eq("id", teamId).maybeSingle();
  const team = data as { owner_id: string; roles: string[]; role_notes: Record<string, string>; team_applications: { role: string; status: string }[] } | null;
  if (!team || team.owner_id !== userId) return { error: "You can only enter a team you started.", field: "team_id" };

  const open = openRoles(team);
  const filled = team.roles.filter((r) => !open.includes(r));
  // From the fixed list, or one of the team's own (older teams typed theirs in)
  const picked = [...new Set(formData.getAll("roles").map(String))].filter((r) => ROLES.includes(r) || team.roles.includes(r));
  const roles = [...filled, ...picked.filter((r) => !filled.includes(r))];
  if (roles.length === 0) return { error: "Keep at least one role.", field: "roles" };
  if (roles.length > 10) return { error: "A team can list up to 10 roles.", field: "roles" };

  const { error } = await supabase.from("team_entries").insert({ team_id: teamId, opportunity_id: opportunityId });
  if (error) {
    if (error.code === "23505") return { error: "This team is already entered.", field: "team_id" };
    return { error: error.code === "42501" ? "This event isn't taking teams any more." : "Couldn't enter the team. Try again." };
  }
  const changed = roles.length !== team.roles.length || roles.some((r) => !team.roles.includes(r));
  if (changed) {
    const notes = Object.fromEntries(Object.entries(team.role_notes ?? {}).filter(([r]) => roles.includes(r)));
    const { error: rolesError } = await supabase.from("teams").update({ roles, role_notes: notes }).eq("id", teamId);
    if (rolesError) return { error: "The team is entered, but its roles couldn't be changed. Try again from the team page." };
  }
  revalidatePath("/", "layout");
  return {};
}

// The owner moves an entry along: going, registered, submitted, placed
export async function setEntryStatus(teamId: string, opportunityId: string, status: string): Promise<SaveResult> {
  const { supabase } = await requireMember();
  if (!isEntryStatus(status)) return { error: "Pick a status." };
  const { data, error } = await supabase.from("team_entries").update({ status }).eq("team_id", teamId).eq("opportunity_id", opportunityId).select("status");
  if (error || !data?.length) return { error: "Couldn't change the status. Try again." };
  revalidatePath("/", "layout");
  return {};
}

export async function deleteTeam(id: string) {
  const { supabase, userId } = await requireMember();
  // What the team built goes with it, and so does its image
  const { data: project } = await supabase.from("team_projects").select("image_url").eq("team_id", id).maybeSingle();
  const { data: deleted } = await supabase.from("teams").delete().eq("id", id).select("id");
  if (deleted?.length) await removeImage(supabase, userId, project?.image_url);
  revalidatePath("/", "layout");
  redirect("/teams");
}

export async function applyToTeam(teamId: string, formData: FormData): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  // A declined invitation would block the application (one row per person per team), so it makes way
  await supabase.from("team_applications").delete().eq("team_id", teamId).eq("user_id", userId).eq("direction", "invite").eq("status", "declined");
  const { error } = await supabase.from("team_applications").insert({
    team_id: teamId,
    user_id: userId,
    role: String(formData.get("role") ?? ""),
    note: String(formData.get("note") ?? "").trim(),
  });
  if (error) {
    if (error.code === "23505") return { error: "You've already applied to this team." };
    // The daily cap (supabase/notification-limits.sql)
    return { error: error.message.includes("a day") ? error.message : "Couldn't send it. Try again." };
  }
  revalidatePath("/", "layout");
  return {};
}

export async function withdrawApplication(teamId: string) {
  const { supabase, userId } = await requireMember();
  await supabase.from("team_applications").delete().eq("team_id", teamId).eq("user_id", userId);
  revalidatePath("/", "layout");
}

export async function respondToApplication(teamId: string, applicationId: string, status: "accepted" | "declined"): Promise<SaveResult> {
  const { supabase } = await requireMember();
  if (status !== "accepted" && status !== "declined") return {};
  const { data, error } = await supabase.from("team_applications").update({ status }).eq("id", applicationId).eq("team_id", teamId).select("id");
  revalidatePath("/", "layout");
  return error || !data?.length ? { error: "Couldn't answer the application. Try again." } : {};
}

// The owner invites someone to one of the team's roles. The database checks it's your team and role, and that
// they're open to a team or one of your connections (supabase/team-invites.sql); a trigger notifies them.
export async function inviteToTeam(teamId: string, personId: string, role: string): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  if (personId === userId) return { error: "You're already on this team." };
  const { error } = await supabase.from("team_applications").insert({
    team_id: teamId,
    user_id: personId,
    role: String(role),
    direction: "invite",
  });
  if (error) {
    if (error.code === "23505") return { error: "They've already applied or been invited." };
    if (error.code === "42501") return { error: "You can only invite people open to a team, or your connections, to a role that's still open." };
    // The daily cap (supabase/team-invites.sql)
    return { error: error.message.includes("a day") ? error.message : "Couldn't send the invitation. Try again." };
  }
  revalidatePath("/", "layout");
  return {};
}

// The owner takes back an invitation that hasn't been answered yet
export async function withdrawInvite(teamId: string, inviteId: string) {
  const { supabase } = await requireMember();
  await supabase.from("team_applications").delete().eq("id", inviteId).eq("team_id", teamId).eq("direction", "invite").eq("status", "pending");
  revalidatePath("/", "layout");
}

// The invited person accepts (and joins in that role, like an accepted application) or declines
export async function answerInvite(inviteId: string, status: "accepted" | "declined"): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  if (status !== "accepted" && status !== "declined") return {};
  const { data, error } = await supabase.from("team_applications").update({ status }).eq("id", inviteId).eq("user_id", userId).eq("direction", "invite").select("id");
  revalidatePath("/", "layout");
  return error || !data?.length ? { error: "Couldn't answer the invitation. Try again." } : {};
}

// The team's owner records what the team built, or edits it (one per team). The database checks it's your team
// and, for a new one, that the event has ended (supabase/shared-projects.sql). Members are asked to confirm by a
// trigger; changing the title or the result asks them again.
export async function saveSharedProject(teamId: string, formData: FormData): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  const text = (key: string) => field(formData, key);
  if (!text("title")) return { error: "Add a name.", field: "title" };
  if (text("title").length > SHARED_PROJECT_TITLE_MAX) return { error: `Keep the name to ${SHARED_PROJECT_TITLE_MAX} characters.`, field: "title" };
  if (text("pitch").length > SHARED_PROJECT_PITCH_MAX) return { error: `Keep it to ${SHARED_PROJECT_PITCH_MAX} characters.`, field: "pitch" };
  if (text("result").length > SHARED_PROJECT_RESULT_MAX) return { error: `Keep the result to ${SHARED_PROJECT_RESULT_MAX} characters.`, field: "result" };
  // Checked before uploading, so nobody else leaves an image behind (an update they can't make changes no rows)
  const { data: team } = await supabase.from("teams").select("owner_id").eq("id", teamId).maybeSingle();
  if (team?.owner_id !== userId) return { error: "Only the team's owner can record what it built." };

  const image = await uploadImage(supabase, userId, formData.get("image"));
  if (image.error) return { error: image.error };
  const fields = {
    title: text("title"),
    pitch: text("pitch"),
    url: toLink(text("url")),
    repo_url: toLink(text("repo_url")),
    result: text("result"),
    ...(image.url ? { image_url: image.url } : {}),
  };
  const { data: before } = await supabase.from("team_projects").select("id, image_url").eq("team_id", teamId).maybeSingle();
  const { error } = before
    ? await supabase.from("team_projects").update(fields).eq("id", before.id)
    : await supabase.from("team_projects").insert({ ...fields, team_id: teamId });
  // Keep exactly one image: the old one goes once the new one is saved, the new one if saving failed
  if (image.url) await removeImage(supabase, userId, error ? image.url : before?.image_url);
  if (error) return { error: error.code === "42501" ? "You can record this once the event has ended." : "Couldn't save it. Check the fields and try again." };
  revalidatePath("/", "layout");
  return {};
}

export async function deleteSharedProject(teamId: string): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  const { data: deleted, error } = await supabase.from("team_projects").delete().eq("team_id", teamId).select("image_url").maybeSingle();
  if (error) return { error: "Couldn't delete it. Try again." };
  // The policy keeps it once another member has confirmed it (supabase/shared-projects.sql)
  if (!deleted) return { error: "A teammate has already put it on their profile, so it can't be deleted. You can still edit it." };
  await removeImage(supabase, userId, deleted?.image_url);
  revalidatePath("/", "layout");
  return {};
}

// A member confirms or declines that a team's project goes on their profile
export async function answerSharedProject(projectId: string, status: "confirmed" | "declined") {
  const { supabase, userId } = await requireMember();
  if (status !== "confirmed" && status !== "declined") return;
  await supabase.from("team_project_members").update({ status }).eq("project_id", projectId).eq("user_id", userId);
  revalidatePath("/", "layout");
}

// Hides a confirmed shared project from your own profile, or shows it again
export async function hideSharedProject(projectId: string, hidden: boolean) {
  const { supabase, userId } = await requireMember();
  await supabase.from("team_project_members").update({ hidden: hidden === true }).eq("project_id", projectId).eq("user_id", userId);
  revalidatePath("/", "layout");
}

// Two-factor authentication (/settings): an authenticator app's 6-digit codes, through Supabase Auth MFA.
// Anyone can turn it on; admins need it to use /admin (supabase/admin.sql).

export type TwoFactorSetup = { factorId?: string; uri?: string; secret?: string; error?: string };

// Starts the setup: the QR code and the key to type in by hand. A setup that was never finished goes first,
// so starting again works.
export async function startTwoFactor(): Promise<TwoFactorSetup> {
  const { supabase } = await requireMember();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator app" });
  if (error || data.type !== "totp") return { error: "Couldn't start the setup. Try again." };
  return { factorId: data.id, uri: data.totp.uri, secret: data.totp.secret };
}

const codeOf = (formData: FormData) => field(formData, "code").replace(/\s/g, "");
const wrongCode = { error: "That code didn't work. Check the time on your phone is right and try again." };

// Checks a code against an authenticator; a right one also verifies this session with it
async function verifyCode(supabase: Supabase, factorId: string, code: string): Promise<SaveResult> {
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code from your app." };
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  return error ? wrongCode : {};
}

async function verifiedFactor(supabase: Supabase) {
  const { data } = await supabase.auth.mfa.listFactors();
  return data?.totp.find((f) => f.status === "verified") ?? null;
}

// Finishes the setup with the first code the app shows
export async function confirmTwoFactor(factorId: string, _prev: SaveResult, formData: FormData): Promise<SaveResult> {
  const { supabase } = await requireMember();
  const result = await verifyCode(supabase, factorId, codeOf(formData));
  if (!result.error) revalidatePath("/", "layout");
  return result;
}

// Turning it off takes a current code, as Supabase asks for a session verified with the authenticator
export async function removeTwoFactor(_prev: SaveResult, formData: FormData): Promise<SaveResult> {
  const { supabase } = await requireMember();
  const factor = await verifiedFactor(supabase);
  if (!factor) return {};
  const result = await verifyCode(supabase, factor.id, codeOf(formData));
  if (result.error) return result;
  const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
  if (error) return { error: "Couldn't turn it off. Try again." };
  revalidatePath("/", "layout");
  return {};
}

// The admin area's code screen: an admin signed in without their second factor enters a code, then goes on
export async function verifyAdminCode(next: string, _prev: SaveResult, formData: FormData): Promise<SaveResult> {
  const { access, supabase } = await adminAccess();
  if (access === "none") notFound();
  const factor = await verifiedFactor(supabase);
  if (!factor) redirect("/admin/verify");
  const result = await verifyCode(supabase, factor.id, codeOf(formData));
  if (result.error) return result;
  const back = localPath(next);
  redirect(back.startsWith("/admin") ? back : "/admin");
}

// The admin area (/admin). Every action starts with requireAdmin() and calls one database function, which checks
// is_admin() again and writes exactly one row to the admin log in the same transaction (supabase/admin.sql).
// Hiding, suspending and dismissing need a reason. requireAdmin() runs first, before anything sent is looked at;
// it's cached per request, so adminCall asking again costs nothing.

async function adminCall(fn: string, args: Record<string, unknown>): Promise<SaveResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc(fn, args);
  // The functions' own refusals are written for people ("Give a reason.", "Already suspended.")
  if (error) return { error: error.code === "22023" || error.code === "P0002" ? error.message : "Couldn't do that. Try again." };
  revalidatePath("/", "layout");
  return {};
}

function reasonOf(formData: FormData, required: boolean): SaveResult & { reason: string } {
  const reason = field(formData, "reason");
  if (required && !reason) return { reason, error: "Give a reason.", field: "reason" };
  if (reason.length > ADMIN_REASON_MAX) return { reason, error: `Keep the reason to ${ADMIN_REASON_MAX} characters.`, field: "reason" };
  return { reason };
}

export async function adminHide(kind: ReportKind, targetId: string, _prev: SaveResult, formData: FormData): Promise<SaveResult> {
  await requireAdmin();
  const { reason, error, field } = reasonOf(formData, true);
  if (error) return { error, field };
  if (!isReportKind(kind)) return { error: "Unknown kind." };
  return adminCall("admin_hide", { kind, target: targetId, reason });
}

export async function adminRestore(kind: ReportKind, targetId: string, _prev: SaveResult, formData: FormData): Promise<SaveResult> {
  await requireAdmin();
  const { reason, error, field } = reasonOf(formData, false);
  if (error) return { error, field };
  if (!isReportKind(kind)) return { error: "Unknown kind." };
  return adminCall("admin_restore", { kind, target: targetId, reason });
}

// `reportId`: the report this answers; the open reports about its target close too (a team's, when its owner is suspended)
export async function adminSuspend(personId: string, reportId: string | null, _prev: SaveResult, formData: FormData): Promise<SaveResult> {
  await requireAdmin();
  const { reason, error, field } = reasonOf(formData, true);
  if (error) return { error, field };
  return adminCall("admin_suspend", { person: personId, reason, report: reportId });
}

export async function adminUnsuspend(personId: string, _prev: SaveResult, formData: FormData): Promise<SaveResult> {
  await requireAdmin();
  const { reason, error, field } = reasonOf(formData, false);
  if (error) return { error, field };
  return adminCall("admin_unsuspend", { person: personId, reason });
}

// Nothing wrong: every open report about the same thing is dismissed
export async function adminDismiss(reportId: string, _prev: SaveResult, formData: FormData): Promise<SaveResult> {
  await requireAdmin();
  const { reason, error, field } = reasonOf(formData, true);
  if (error) return { error, field };
  return adminCall("admin_dismiss", { report: reportId, reason });
}

export async function adminSetFeatured(eventId: string, featured: boolean) {
  await adminCall("admin_set_featured", { event: eventId, featured: featured === true });
}
