"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { parseList } from "@/lib/match";
import { linkWorks } from "@/lib/opportunities";
import { toLink } from "@/lib/portfolio";

export async function createPost(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const content = String(formData.get("content")).trim();
  if (!content) return;
  await supabase.from("posts").insert({ author_id: userId, content });
  revalidatePath("/feed");
}

export async function createIdea(formData: FormData) {
  const { supabase, userId } = await requireUser();
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

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

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

export async function updateProfile(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const photo = await uploadImage(supabase, userId, formData.get("photo"));
  if (photo.error) redirect(`/profile?error=${encodeURIComponent(photo.error)}`);

  const { error } = await supabase
    .from("profiles")
    .update({
      name: text("name"),
      headline: text("headline"),
      university: text("university"),
      graduation_year: Number(formData.get("graduation_year")) || 0,
      bio: text("bio"),
      skills: parseList(formData.get("skills")),
      interests: parseList(formData.get("interests")),
      looking_for: parseList(formData.get("looking_for")),
      github: toLink(text("github"), "https://github.com/"),
      linkedin: toLink(text("linkedin"), "https://www.linkedin.com/in/"),
      website: toLink(text("website")),
      open_to_collaborate: formData.get("open_to_collaborate") === "on",
      // Stored as a bare username: "@name" and "https://t.me/name" both become "name"
      telegram: text("telegram").replace(/^(https?:\/\/)?(t\.me\/)?@?/i, ""),
      email: text("email"),
      // Only replace the photo when a new one was chosen
      ...(photo.url ? { avatar_url: photo.url } : {}),
    })
    .eq("id", userId);
  if (error) redirect(`/profile?error=${encodeURIComponent("Couldn't save your profile. Check the fields and try again.")}`);
  revalidatePath("/", "layout");
  redirect(`/u/${userId}`);
}

// `id` is null for a new project
export async function saveProject(id: string | null, formData: FormData) {
  const { supabase, userId } = await requireUser();
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const fail = (message: string): never => redirect(`/profile/projects/${id ?? "new"}?error=${encodeURIComponent(message)}`);

  const image = await uploadImage(supabase, userId, formData.get("image"));
  if (image.error) fail(image.error);
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
    skills: parseList(formData.get("skills")),
    ...(image.url ? { image_url: image.url } : {}),
  };
  const { error } = id
    ? await supabase.from("projects").update(fields).eq("id", id).eq("user_id", userId)
    : await supabase.from("projects").insert({ ...fields, user_id: userId });
  if (error) fail("Couldn't save the project. Check the fields and try again.");
  revalidatePath("/", "layout");
  redirect(`/u/${userId}`);
}

export async function deleteProject(id: string) {
  const { supabase, userId } = await requireUser();
  await supabase.from("projects").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/", "layout");
  redirect(`/u/${userId}`);
}

// `id` is null for a new entry. Months arrive as "2026-03" and are stored as the first day of that month.
export async function saveExperience(id: string | null, formData: FormData) {
  const { supabase, userId } = await requireUser();
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const day = (key: string) => (/^\d{4}-\d{2}$/.test(text(key)) ? `${text(key)}-01` : null);
  const fail = (message: string): never => redirect(`/profile/experience/${id ?? "new"}?error=${encodeURIComponent(message)}`);

  const start = day("start");
  if (!start) fail("Add the month it started.");
  const fields = {
    role: text("role"),
    company: text("company"),
    start_date: start,
    end_date: formData.get("current") === "on" ? null : day("end"),
    description: text("description"),
  };
  const { error } = id
    ? await supabase.from("experiences").update(fields).eq("id", id).eq("user_id", userId)
    : await supabase.from("experiences").insert({ ...fields, user_id: userId });
  if (error) fail(error.code === "23514" ? "The end should be after the start." : "Couldn't save it. Check the fields and try again.");
  revalidatePath("/", "layout");
  redirect(`/u/${userId}`);
}

export async function deleteExperience(id: string) {
  const { supabase, userId } = await requireUser();
  await supabase.from("experiences").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/", "layout");
  redirect(`/u/${userId}`);
}

export async function connect(receiverId: string) {
  const { supabase, userId } = await requireUser();
  // If they already asked you, connecting back accepts their request instead of creating a second one
  const { data: theirs } = await supabase.from("connections").select("id").eq("sender_id", receiverId).eq("receiver_id", userId).maybeSingle();
  if (theirs) await supabase.from("connections").update({ status: "accepted" }).eq("id", theirs.id).eq("status", "pending");
  else await supabase.from("connections").insert({ sender_id: userId, receiver_id: receiverId });
  revalidatePath("/", "layout");
}

export async function respond(connectionId: string, status: "accepted" | "declined") {
  const { supabase } = await requireUser();
  await supabase.from("connections").update({ status }).eq("id", connectionId);
  revalidatePath("/", "layout");
}

export async function addOpportunity(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const fail = (message: string): never => redirect(`/opportunities/new?error=${encodeURIComponent(message)}`);

  const url = text("url");
  if (!(await linkWorks(url))) fail("That link doesn't open. Check it and try again.");

  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      title: text("title"),
      type: text("type"),
      organizer: text("organizer"),
      location: text("location"),
      url,
      starts_at: text("starts_at") || null,
      deadline: text("deadline") || null,
      description: text("description"),
      submitted_by: userId,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") fail("This link is already listed.");
    if (error?.code === "23514") fail("Check the dates: the deadline should be before the start.");
    return fail(error?.message ?? "Couldn't add it. Try again.");
  }
  revalidatePath("/opportunities");
  redirect(`/opportunities/${data.id}`);
}

export async function setOpportunityStatus(id: string, status: "live" | "removed") {
  const { supabase } = await requireUser();
  await supabase.from("opportunities").update({ status }).eq("id", id);
  revalidatePath("/opportunities");
}

export async function deleteOpportunity(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("opportunities").delete().eq("id", id);
  revalidatePath("/opportunities");
  redirect("/opportunities");
}

export async function reportOpportunity(id: string, formData: FormData) {
  const { supabase, userId } = await requireUser();
  await supabase.from("opportunity_reports").insert({ opportunity_id: id, user_id: userId, reason: String(formData.get("reason")) });
  revalidatePath(`/opportunities/${id}`);
}

export async function lookForTeam(opportunityId: string, formData: FormData) {
  const { supabase, userId } = await requireUser();
  await supabase.from("opportunity_participants").upsert({
    opportunity_id: opportunityId,
    user_id: userId,
    note: String(formData.get("note") ?? "").trim(),
  });
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function stopLooking(opportunityId: string) {
  const { supabase, userId } = await requireUser();
  await supabase.from("opportunity_participants").delete().eq("opportunity_id", opportunityId).eq("user_id", userId);
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function createTeam(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const fail = (message: string): never => redirect(`/teams/new?error=${encodeURIComponent(message)}`);

  // Keeps the casing people typed ("CTO"), drops repeats
  const roles = text("roles").split(",").map((r) => r.trim().slice(0, 40)).filter(Boolean);
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
  const { supabase } = await requireUser();
  await supabase.from("teams").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/teams");
}

export async function applyToTeam(teamId: string, formData: FormData) {
  const { supabase, userId } = await requireUser();
  await supabase.from("team_applications").insert({
    team_id: teamId,
    user_id: userId,
    role: String(formData.get("role") ?? ""),
    note: String(formData.get("note") ?? "").trim(),
  });
  revalidatePath("/", "layout");
}

export async function withdrawApplication(teamId: string) {
  const { supabase, userId } = await requireUser();
  await supabase.from("team_applications").delete().eq("team_id", teamId).eq("user_id", userId);
  revalidatePath("/", "layout");
}

export async function respondToApplication(teamId: string, applicationId: string, status: "accepted" | "declined") {
  const { supabase } = await requireUser();
  await supabase.from("team_applications").update({ status }).eq("id", applicationId).eq("team_id", teamId);
  revalidatePath("/", "layout");
}
