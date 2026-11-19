"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, requireMember, requireUser } from "@/lib/supabase/server";
import { parseList } from "@/lib/match";
import { opportunityTypes } from "@/lib/opportunities";
import { linkWorks } from "@/lib/link-check";
import { EXPERIENCE_DESCRIPTION_MAX, EXPERIENCE_TYPES, toLink } from "@/lib/portfolio";
import { AWARD_DESCRIPTION_MAX, AWARD_TEAMMATES_MAX, PLACEMENTS } from "@/lib/awards";
import { knownSkills } from "@/lib/skills";
import { knownGoals } from "@/lib/goals";

// Starts Google sign-in; /auth/callback brings people back to the page the button was on
export async function signIn() {
  const supabase = await createClient();
  const h = await headers();
  const origin = h.get("origin") ?? "";
  const from = URL.parse(h.get("referer") ?? "");
  const next = from && from.origin === origin ? from.pathname + from.search : "/";
  const { data } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  redirect(data.url ?? next);
}

// Afterwards the visitor browses read-only, without an account
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/opportunities");
}

export type SearchResults = { people: { id: string; name: string }[]; teams: { id: string; title: string }[] };

// % and _ are wildcards in ilike; match them literally
const containing = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

// Nav search: people by name and teams by title, up to 5 of each. Signed-out visitors can search too.
export async function searchGlobal(query: string): Promise<SearchResults> {
  const { supabase } = await requireUser();
  const q = query.trim().slice(0, 50);
  if (q.length < 2) return { people: [], teams: [] };
  const pattern = containing(q);
  const [people, teams] = await Promise.all([
    supabase.from("profiles").select("id, name").ilike("name", pattern).order("name").limit(5),
    supabase.from("teams").select("id, title").ilike("title", pattern).order("created_at", { ascending: false }).limit(5),
  ]);
  return { people: people.data ?? [], teams: teams.data ?? [] };
}

// Notifications are written by database triggers (supabase/notifications.sql); here they're only read
export async function openNotification(id: string) {
  const { supabase, userId } = await requireMember();
  const { data } = await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", userId).select("type, link").maybeSingle();
  revalidatePath("/", "layout");
  // New applicants to your team are reviewed from Your teams; the stored link points at the team
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
  const photo = await uploadImage(supabase, userId, formData.get("photo"));
  if (photo.error) return { error: photo.error };
  if (!field(formData, "name")) return { error: "Add your name." };
  return updateMyProfile({
    name: field(formData, "name"),
    headline: field(formData, "headline"),
    university: field(formData, "university"),
    graduation_year: Number(formData.get("graduation_year")) || 0,
    open_to_collaborate: formData.get("open_to_collaborate") === "on",
    // Only replace the photo when a new one was chosen
    ...(photo.url ? { avatar_url: photo.url } : {}),
  });
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
  const university = String(formData.get("university") ?? "").trim();
  const skills = knownSkills(formData.getAll("skills"));
  if (!university || skills.length === 0) redirect(`/onboarding?error=${encodeURIComponent("Add your university and at least one skill.")}`);
  const year = Number(formData.get("graduation_year"));

  const { error } = await supabase
    .from("profiles")
    .update({
      university,
      skills,
      goals: knownGoals(formData.getAll("goals")),
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
  const { error } = id
    ? await supabase.from("projects").update(fields).eq("id", id).eq("user_id", userId)
    : await supabase.from("projects").insert({ ...fields, user_id: userId });
  if (error) return { error: "Couldn't save the project. Check the fields and try again." };
  revalidatePath("/", "layout");
  return {};
}

export async function deleteProject(id: string): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  const { error } = await supabase.from("projects").delete().eq("id", id).eq("user_id", userId);
  if (error) return { error: "Couldn't delete the project. Try again." };
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

  // A Schub opportunity lends its title, and a team you were on for it (started or accepted to) is linked
  let eventName = text("event_name");
  let teamId: string | null = null;
  if (opportunityId) {
    const [opportunity, owned, joined] = await Promise.all([
      supabase.from("opportunities").select("title").eq("id", opportunityId).maybeSingle(),
      supabase.from("teams").select("id").eq("opportunity_id", opportunityId).eq("owner_id", userId).limit(1),
      supabase.from("team_applications").select("team_id, team:teams!inner(opportunity_id)").eq("user_id", userId).eq("status", "accepted").eq("team.opportunity_id", opportunityId).limit(1),
    ]);
    if (!opportunity.data) return { error: "That opportunity isn't listed any more. Type the event name instead.", field: "event" };
    eventName = opportunity.data.title;
    teamId = owned.data?.[0]?.id ?? joined.data?.[0]?.team_id ?? null;
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

export async function connect(receiverId: string) {
  const { supabase, userId } = await requireMember();
  // If they already asked you, connecting back accepts their request instead of creating a second one
  const { data: theirs } = await supabase.from("connections").select("id").eq("sender_id", receiverId).eq("receiver_id", userId).maybeSingle();
  if (theirs) await supabase.from("connections").update({ status: "accepted" }).eq("id", theirs.id).eq("status", "pending");
  else await supabase.from("connections").insert({ sender_id: userId, receiver_id: receiverId });
  revalidatePath("/", "layout");
}

// Server actions can be called with any arguments, so the status is checked here too
export async function respond(connectionId: string, status: "accepted" | "declined") {
  const { supabase } = await requireMember();
  if (status !== "accepted" && status !== "declined") return;
  await supabase.from("connections").update({ status }).eq("id", connectionId);
  revalidatePath("/", "layout");
}

// The sender takes back a request the other person hasn't answered yet (policy in supabase/people-requests.sql)
export async function withdrawRequest(connectionId: string) {
  const { supabase, userId } = await requireMember();
  await supabase.from("connections").delete().eq("id", connectionId).eq("sender_id", userId).eq("status", "pending");
  revalidatePath("/", "layout");
}

// Errors come back with the field they belong to, so the form can show them there. Success opens the new page.
export async function addOpportunity(formData: FormData): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const day = (key: string) => (/^\d{4}-\d{2}-\d{2}$/.test(text(key)) ? text(key) : null);

  const deadline = day("deadline");
  const startsAt = day("starts_at");
  const endsAt = day("ends_at");
  if (text("title").length < 3) return { error: "Add a title of at least 3 characters.", field: "title" };
  if (!(text("type") in opportunityTypes)) return { error: "Choose a type.", field: "type" };
  if (deadline && startsAt && deadline > startsAt) return { error: "The deadline should be on or before the start.", field: "deadline" };
  const begins = startsAt ?? deadline;
  if (endsAt && begins && endsAt < begins) return { error: "The end can't be before the start.", field: "ends_at" };
  const url = text("url");
  if (!(await linkWorks(url))) return { error: "That link doesn't open. Check it and try again.", field: "url" };

  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      title: text("title"),
      type: text("type"),
      organizer: text("organizer"),
      location: text("location"),
      online: formData.get("online") === "on",
      url,
      starts_at: startsAt,
      deadline,
      ends_at: endsAt,
      description: text("description"),
      submitted_by: userId,
    })
    .select("id")
    .single();
  if (error || !data) {
    const message = error?.message ?? "";
    if (error?.code === "23505") return { error: "This link is already listed.", field: "url" };
    if (message.includes("ends_after_start")) return { error: "The end can't be before the start.", field: "ends_at" };
    if (message.includes("deadline_before_start")) return { error: "The deadline should be on or before the start.", field: "deadline" };
    // Raised by check_new_opportunity() in supabase/opportunities.sql
    if (message.includes("similar opportunity")) return { error: message, field: "title" };
    if (message.includes("in the past")) return { error: message, field: deadline ? "deadline" : "starts_at" };
    if (message.includes("a day")) return { error: message };
    return { error: "Couldn't add it. Try again." };
  }
  revalidatePath("/opportunities");
  redirect(`/opportunities/${data.id}`);
}

export async function setOpportunityStatus(id: string, status: "live" | "removed") {
  const { supabase } = await requireMember();
  if (status !== "live" && status !== "removed") return;
  await supabase.from("opportunities").update({ status }).eq("id", id);
  revalidatePath("/opportunities");
}

export async function deleteOpportunity(id: string) {
  const { supabase } = await requireMember();
  await supabase.from("opportunities").delete().eq("id", id);
  revalidatePath("/opportunities");
  redirect("/opportunities");
}

export async function reportOpportunity(id: string, formData: FormData) {
  const { supabase, userId } = await requireMember();
  await supabase.from("opportunity_reports").insert({ opportunity_id: id, user_id: userId, reason: String(formData.get("reason")) });
  revalidatePath(`/opportunities/${id}`);
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

export async function stopLooking(opportunityId: string) {
  const { supabase, userId } = await requireMember();
  await supabase.from("opportunity_participants").delete().eq("opportunity_id", opportunityId).eq("user_id", userId);
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function createTeam(formData: FormData) {
  const { supabase, userId } = await requireMember();
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const fail = (message: string): never => redirect(`/teams/new?error=${encodeURIComponent(message)}`);

  // One "roles" value per role row; commas inside one are split too. Keeps the casing people typed ("CTO"), drops repeats.
  const roles = formData.getAll("roles").flatMap((v) => String(v).split(",")).map((r) => r.trim().slice(0, 40)).filter(Boolean);
  const unique = roles.filter((r, i) => roles.findIndex((x) => x.toLowerCase() === r.toLowerCase()) === i);
  if (unique.length === 0) fail("Add at least one open role.");
  if (unique.length > 10) fail("List up to 10 roles.");

  const { data, error } = await supabase
    .from("teams")
    .insert({
      owner_id: userId,
      title: text("title"),
      description: text("description"),
      roles: unique,
      opportunity_id: text("opportunity_id") || null,
    })
    .select("id")
    .single();
  if (error || !data) return fail(error?.code === "23514" ? "The name should be 3 to 120 characters." : "Couldn't post the team. Try again.");
  revalidatePath("/", "layout");
  redirect(`/teams/${data.id}`);
}

export async function deleteTeam(id: string) {
  const { supabase } = await requireMember();
  await supabase.from("teams").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/teams");
}

export async function applyToTeam(teamId: string, formData: FormData): Promise<SaveResult> {
  const { supabase, userId } = await requireMember();
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

export async function respondToApplication(teamId: string, applicationId: string, status: "accepted" | "declined") {
  const { supabase } = await requireMember();
  if (status !== "accepted" && status !== "declined") return;
  await supabase.from("team_applications").update({ status }).eq("id", applicationId).eq("team_id", teamId);
  revalidatePath("/", "layout");
}
