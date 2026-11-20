// Same scoring as the iOS app's DiscoverViewModel.computeMatches, plus a language adjustment the iOS app doesn't have.

export type MatchableProfile = {
  skills: string[];
  interests: string[];
  open_to_collaborate: boolean;
  // Languages they work in (lib/languages.ts); missing or empty when not given
  languages?: string[];
};

// When both listed languages: sharing one adds this much to the score, sharing none takes this much off
export const SHARED_LANGUAGE_BONUS = 10;
export const NO_SHARED_LANGUAGE_PENALTY = 40;

export function matchScore(them: MatchableProfile, me: MatchableProfile) {
  const mySkills = new Set(me.skills);
  const myInterests = new Set(me.interests);

  const complementary = them.skills.filter((s) => !mySkills.has(s)).sort();
  const shared = them.skills.filter((s) => mySkills.has(s));
  const commonInterests = them.interests.filter((i) => myInterests.has(i));

  const raw = complementary.length * 3 + commonInterests.length * 2 + shared.length;
  const max = Math.max(1, them.skills.length * 3 + them.interests.length * 2);
  // Working together needs a language in common; it only counts when both said which ones they use
  const theirs = them.languages ?? [];
  const mine = me.languages ?? [];
  const language = theirs.length === 0 || mine.length === 0 ? 0
    : theirs.some((l) => mine.includes(l)) ? SHARED_LANGUAGE_BONUS : -NO_SHARED_LANGUAGE_PENALTY;
  const score = Math.min(100, Math.max(15, Math.floor((raw * 100) / max) + language));

  return { score, complementary };
}

// One short line on why someone is worth meeting: skills they have that you don't, else shared interests,
// else shared skills. Empty when there's nothing to say, or you haven't added skills yet.
export function matchReason(them: MatchableProfile, me: MatchableProfile) {
  // Says why the score is low when the language penalty applied
  const theirs = them.languages ?? [];
  const mine = me.languages ?? [];
  if (theirs.length > 0 && mine.length > 0 && !theirs.some((l) => mine.includes(l))) return "No language in common";
  if (me.skills.length === 0) return "";
  const { complementary } = matchScore(them, me);
  if (complementary.length > 0) return `Has ${complementary.slice(0, 2).join(", ")} — you don't`;
  const interests = them.interests.filter((i) => me.interests.includes(i));
  if (interests.length > 0) return `Also into ${interests.slice(0, 2).join(", ")}`;
  const skills = them.skills.filter((s) => me.skills.includes(s));
  if (skills.length > 0) return `Also works with ${skills.slice(0, 2).join(", ")}`;
  return "";
}

export function parseList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
