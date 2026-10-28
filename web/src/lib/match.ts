// Same scoring as the iOS app's DiscoverViewModel.computeMatches.

export type MatchableProfile = {
  skills: string[];
  interests: string[];
  open_to_collaborate: boolean;
};

export function matchScore(them: MatchableProfile, me: MatchableProfile) {
  const mySkills = new Set(me.skills);
  const myInterests = new Set(me.interests);

  const complementary = them.skills.filter((s) => !mySkills.has(s)).sort();
  const shared = them.skills.filter((s) => mySkills.has(s));
  const commonInterests = them.interests.filter((i) => myInterests.has(i));

  const raw = complementary.length * 3 + commonInterests.length * 2 + shared.length;
  const max = Math.max(1, them.skills.length * 3 + them.interests.length * 2);
  const score = Math.min(100, Math.max(15, Math.floor((raw * 100) / max)));

  return { score, complementary };
}

export function parseList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
