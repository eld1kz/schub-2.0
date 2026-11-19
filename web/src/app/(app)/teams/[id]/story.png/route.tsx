import type { NextRequest } from "next/server";
import { loadStory, storyImage } from "@/lib/story-image";

// The 1080x1920 story image. ?theme=dark for the dark one; ?v= (storyVersion) only changes the address.
export async function GET(request: NextRequest, ctx: RouteContext<"/teams/[id]/story.png">) {
  const { id } = await ctx.params;
  const story = await loadStory(id);
  if (!story) return new Response("Not found", { status: 404 });
  const theme = request.nextUrl.searchParams.get("theme") === "dark" ? "dark" : "light";
  return storyImage(story, theme, `${request.nextUrl.origin}/teams/${id}?ref=story`);
}
