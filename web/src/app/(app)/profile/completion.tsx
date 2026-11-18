import { mediaUrl } from "@/lib/portfolio";
import { knownSkills } from "@/lib/skills";

type Fields = {
  avatar_url: string;
  name: string;
  headline: string;
  university: string;
  bio: string;
  skills: string[];
  interests: string[];
  github: string;
  linkedin: string;
  open_to_collaborate: boolean;
};

// Each check is worth `points`; together they add up to 100. `hint` is shown while it's missing.
function checks(p: Fields) {
  return [
    { points: 15, done: Boolean(mediaUrl(p.avatar_url)), hint: "Upload a photo" },
    { points: 10, done: p.name.trim() !== "", hint: "Add your name" },
    { points: 10, done: p.headline.trim() !== "", hint: "Add a headline" },
    { points: 10, done: p.university.trim() !== "", hint: "Add your university" },
    { points: 15, done: p.bio.trim().length >= 20, hint: "Write a bio (at least 20 characters)" },
    // Only skills from the list count, since the form drops the rest on save
    { points: 15, done: knownSkills(p.skills).length >= 3, hint: "Pick at least 3 skills" },
    { points: 10, done: p.interests.length > 0, hint: "Add an interest" },
    { points: 10, done: p.github !== "" || p.linkedin !== "", hint: "Link your GitHub or LinkedIn" },
    { points: 5, done: p.open_to_collaborate, hint: "Turn on Open to collaborate" },
  ];
}

export function ProfileCompletion({ profile }: { profile: Fields }) {
  const all = checks(profile);
  const score = all.reduce((sum, c) => sum + (c.done ? c.points : 0), 0);
  const missing = all.filter((c) => !c.done);

  if (score === 100) return <p className="text-sm text-ink2">Profile complete</p>;

  return (
    <div className="space-y-2">
      <p className="text-right text-[13px] text-muted tabular-nums">{score}% complete</p>
      <progress
        value={score}
        max={100}
        aria-label="Profile completion"
        className="block h-1.5 w-full appearance-none overflow-hidden rounded-full bg-border [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-border [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-accent"
      />
      <ul className="list-disc space-y-0.5 pl-4 text-[13px] text-ink2">
        {missing.map((c) => <li key={c.hint}>{c.hint}</li>)}
      </ul>
    </div>
  );
}
