"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { parseList } from "@/lib/match";
import { linkWorks } from "@/lib/opportunities";

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

export async function updateProfile(formData: FormData) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("profiles")
    .update({
      name: String(formData.get("name")).trim(),
      university: String(formData.get("university")).trim(),
      graduation_year: Number(formData.get("graduation_year")) || 0,
      bio: String(formData.get("bio")).trim(),
      skills: parseList(formData.get("skills")),
      interests: parseList(formData.get("interests")),
      open_to_collaborate: formData.get("open_to_collaborate") === "on",
    })
    .eq("id", userId);
  revalidatePath("/", "layout");
  redirect("/opportunities");
}

export async function connect(receiverId: string) {
  const { supabase, userId } = await requireUser();
  await supabase.from("connections").insert({ sender_id: userId, receiver_id: receiverId });
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
