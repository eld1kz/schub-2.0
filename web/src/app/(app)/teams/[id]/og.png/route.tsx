import type { NextRequest } from "next/server";
import { loadStory, previewImage } from "@/lib/story-image";

// The 1200x630 link preview for a team page (see generateMetadata in ../page.tsx)
export async function GET(_request: NextRequest, ctx: RouteContext<"/teams/[id]/og.png">) {
  const { id } = await ctx.params;
  const story = await loadStory(id);
  if (!story) return new Response("Not found", { status: 404 });
  return previewImage(story, "light");
}
