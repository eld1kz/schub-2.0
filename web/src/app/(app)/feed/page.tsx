import { createClient } from "@/lib/supabase/server";
import { createIdea, createPost } from "@/app/actions";

type Author = { name: string; university: string } | null;
type Item =
  | { kind: "post"; id: string; created_at: string; author: Author; content: string }
  | { kind: "idea"; id: string; created_at: string; author: Author; title: string; description: string; skills_needed: string[]; stage: string };

export default async function FeedPage() {
  const supabase = await createClient();
  const [posts, ideas] = await Promise.all([
    supabase.from("posts").select("id, created_at, content, author:profiles(name, university)").order("created_at", { ascending: false }).limit(50),
    supabase.from("ideas").select("id, created_at, title, description, skills_needed, stage, author:profiles(name, university)").order("created_at", { ascending: false }).limit(50),
  ]);

  const items = [
    ...(posts.data ?? []).map((p) => ({ ...p, kind: "post" }) as unknown as Item),
    ...(ideas.data ?? []).map((i) => ({ ...i, kind: "idea" }) as unknown as Item),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="space-y-10">
      <section className="grid gap-6 sm:grid-cols-2">
        <form action={createPost} className="space-y-2">
          <h2 className="text-sm font-medium">Post an update</h2>
          <textarea name="content" rows={4} placeholder="What are you working on?" required maxLength={2000} className="input" />
          <button className="btn">Post</button>
        </form>
        <form action={createIdea} className="space-y-2">
          <h2 className="text-sm font-medium">Share an idea</h2>
          <input name="title" placeholder="Title" required maxLength={200} className="input" />
          <textarea name="description" rows={2} placeholder="Description" className="input" />
          <input name="skills_needed" placeholder="Skills needed, comma separated" className="input" />
          <div className="flex gap-2">
            <select name="stage" className="input">
              <option value="idea">Idea</option>
              <option value="building">Building</option>
              <option value="launched">Launched</option>
            </select>
            <button className="btn">Share</button>
          </div>
        </form>
      </section>

      <section className="divide-y divide-border border-t border-border">
        {items.length === 0 && <p className="py-6 text-sm text-muted">Nothing here yet.</p>}
        {items.map((item) => (
          <article key={item.kind + item.id} className="py-5">
            <p className="text-sm">
              <span className="font-medium">{item.author?.name || "Unnamed"}</span>
              <span className="text-muted"> · {item.author?.university || "—"} · {new Date(item.created_at).toLocaleDateString()}</span>
            </p>
            {item.kind === "post" ? (
              <p className="mt-2 whitespace-pre-wrap">{item.content}</p>
            ) : (
              <div className="mt-2">
                <p className="font-medium">{item.title} <span className="ml-1 text-xs font-normal text-muted uppercase">{item.stage}</span></p>
                {item.description && <p className="mt-1 whitespace-pre-wrap text-sm">{item.description}</p>}
                {item.skills_needed.length > 0 && <p className="mt-2 text-sm text-muted">Needs: {item.skills_needed.join(", ")}</p>}
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
