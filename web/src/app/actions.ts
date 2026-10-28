"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { parseList } from "@/lib/match";

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
  redirect("/discover");
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
