-- People → Discover without loading every profile. Run once in Supabase Dashboard → SQL Editor,
-- after public-read.sql. Safe to run twice.
-- The page now filters and pages through profiles in its query; the skill chips above the list
-- need how many people have each skill, which this counts in the database instead.

create or replace function skill_counts()
returns table (skill text, people bigint)
language sql stable set search_path = public as $$
  select s, count(*) from profiles, unnest(skills) s where name <> '' group by s;
$$;

grant execute on function skill_counts() to anon, authenticated;
