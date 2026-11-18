-- Seed opportunities. Run in Supabase Dashboard → SQL Editor, after opportunities.sql.
-- Every link and date was checked on the official page on 2026-11-18.
--
-- Safe to run twice: a row is skipped when its link is already listed (same url_key),
-- and also when its dates have passed, so running it late doesn't fail on the past-dates check.
-- Rows are submitted by the newest admin with a real (non-guest) account; run fix_admin.sql first.

begin;

-- The admin who submits every row: the most recently created non-guest admin
create function pg_temp.seed_admin() returns uuid language sql stable as $$
  select a.user_id from admins a join auth.users u on u.id = a.user_id
  where not u.is_anonymous
  order by u.created_at desc
  limit 1
$$;

do $$
begin
  if pg_temp.seed_admin() is null then
    raise exception 'No admin with a real (non-guest) account yet. Run fix_admin.sql first.';
  end if;
end $$;

-- In the SQL Editor auth.uid() is empty, so is_admin() is false and the 5-a-day limit would stop
-- the 6th insert. Act as the admin for this transaction only; the other checks still run.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', pg_temp.seed_admin(), 'role', 'authenticated')::text,
  true
);

-- Same normalization as opportunities.url_key
create function pg_temp.url_key(u text) returns text language sql immutable as $$
  select lower(regexp_replace(regexp_replace(u, '^https?://(www\.)?', ''), '/*([?#].*)?$', ''))
$$;

-- Korea ----------------------------------------------------------------------

-- Source: https://recruit.navercorp.com/rcrt/list.do (dates also in the SNU notice of 2026-11-16)
insert into opportunities (title, type, organizer, location, url, starts_at, deadline, description, submitted_by)
select v.*, pg_temp.seed_admin()
from (values (
  'NAVER 2027 Winter Internship', 'internship'::opportunity_type, 'NAVER', 'South Korea',
  'https://recruit.navercorp.com/rcrt/list.do', '2027-01-04'::date, '2026-11-23'::date,
  'An 8-week full-time winter internship with Business, Product and Corporate tracks. Open to bachelor''s and master''s students at universities in Korea, including students on leave and those about to graduate.'
)) v(title, type, organizer, location, url, starts_at, deadline, description)
where not exists (select 1 from opportunities o where o.url_key = pg_temp.url_key(v.url))
  and coalesce(v.deadline, v.starts_at) >= current_date;

-- Source: https://careers.daangn.com/2027-product-builder-internship/
insert into opportunities (title, type, organizer, location, url, starts_at, deadline, description, submitted_by)
select v.*, pg_temp.seed_admin()
from (values (
  'Daangn 2027 Product Builder Internship (Backend)', 'internship'::opportunity_type, 'Daangn', 'Seoul, South Korea',
  'https://careers.daangn.com/2027-product-builder-internship/', '2027-01-25'::date, '2026-12-06'::date,
  'A full-time backend engineering internship that can convert to a full-time offer. For people who have built, deployed and run a service with real users.'
)) v(title, type, organizer, location, url, starts_at, deadline, description)
where not exists (select 1 from opportunities o where o.url_key = pg_temp.url_key(v.url))
  and coalesce(v.deadline, v.starts_at) >= current_date;

-- Source: https://hr-suprema.career.greetinghr.com/ko/o/244279
insert into opportunities (title, type, organizer, location, url, starts_at, deadline, description, submitted_by)
select v.*, pg_temp.seed_admin()
from (values (
  'Suprema 2027 Hiring-Linked Internship (SW Development)', 'internship'::opportunity_type, 'Suprema', 'Seongnam, South Korea',
  'https://hr-suprema.career.greetinghr.com/ko/o/244279', '2027-01-11'::date, '2026-11-30'::date,
  'A 13-week software development internship that can lead to a full-time role. Open to graduates of 4-year universities and students graduating by February 2027.'
)) v(title, type, organizer, location, url, starts_at, deadline, description)
where not exists (select 1 from opportunities o where o.url_key = pg_temp.url_key(v.url))
  and coalesce(v.deadline, v.starts_at) >= current_date;

-- Online ---------------------------------------------------------------------

-- Source: https://adventofcode.com/2026
insert into opportunities (title, type, organizer, location, url, starts_at, deadline, description, submitted_by)
select v.*, pg_temp.seed_admin()
from (values (
  'Advent of Code 2026', 'competition'::opportunity_type, 'Advent of Code', 'Online',
  'https://adventofcode.com/2026', '2026-12-01'::date, null::date,
  'Daily programming puzzles through December that you can solve in any language. Free and open to anyone.'
)) v(title, type, organizer, location, url, starts_at, deadline, description)
where not exists (select 1 from opportunities o where o.url_key = pg_temp.url_key(v.url))
  and coalesce(v.deadline, v.starts_at) >= current_date;

-- Source: https://ghw.mlh.com/events
insert into opportunities (title, type, organizer, location, url, starts_at, deadline, description, submitted_by)
select v.*, pg_temp.seed_admin()
from (values (
  'MLH Global Hack Week: Open Source Week', 'hackathon'::opportunity_type, 'Major League Hacking', 'Online',
  'https://ghw.mlh.com/events', '2026-12-04'::date, null::date,
  'A free week-long online hackathon focused on open source, running December 4-10, 2026. Open to anyone 13 or older, worldwide.'
)) v(title, type, organizer, location, url, starts_at, deadline, description)
where not exists (select 1 from opportunities o where o.url_key = pg_temp.url_key(v.url))
  and coalesce(v.deadline, v.starts_at) >= current_date;

-- Source: https://worldengineeringday.net/hackathon/
insert into opportunities (title, type, organizer, location, url, starts_at, deadline, description, submitted_by)
select v.*, pg_temp.seed_admin()
from (values (
  'WFEO Hackathon on Sustainable Transport Engineering 2027', 'hackathon'::opportunity_type, 'World Federation of Engineering Organizations', 'Online',
  'https://worldengineeringday.net/hackathon/', null::date, '2026-12-12'::date,
  'A free remote hackathon on sustainable transport; teams of 3-5 submit a video and written solution in English. Mainly for engineering students and engineers under 30, from any country.'
)) v(title, type, organizer, location, url, starts_at, deadline, description)
where not exists (select 1 from opportunities o where o.url_key = pg_temp.url_key(v.url))
  and coalesce(v.deadline, v.starts_at) >= current_date;

-- Source: https://developer.apple.com/swift-student-challenge/
insert into opportunities (title, type, organizer, location, url, starts_at, deadline, description, submitted_by)
select v.*, pg_temp.seed_admin()
from (values (
  'Swift Student Challenge 2027', 'competition'::opportunity_type, 'Apple', 'Online',
  'https://developer.apple.com/swift-student-challenge/', null::date, '2027-02-28'::date,
  'Build an app playground on your own and submit it between February 8 and 28, 2027. For students enrolled in school or a STEM program; in Korea you must be 14 or older.'
)) v(title, type, organizer, location, url, starts_at, deadline, description)
where not exists (select 1 from opportunities o where o.url_key = pg_temp.url_key(v.url))
  and coalesce(v.deadline, v.starts_at) >= current_date;

-- Source: https://imaginecup.microsoft.com/Support/faq
insert into opportunities (title, type, organizer, location, url, starts_at, deadline, description, submitted_by)
select v.*, pg_temp.seed_admin()
from (values (
  'Microsoft Imagine Cup 2027', 'competition'::opportunity_type, 'Microsoft for Startups', 'Online',
  'https://imaginecup.microsoft.com/', null::date, '2027-02-28'::date,
  'A startup competition for early-stage software startups, with a Student Startup category. The startup must be a registered company founded on or after November 2, 2024, and entrants must be 18 or older.'
)) v(title, type, organizer, location, url, starts_at, deadline, description)
where not exists (select 1 from opportunities o where o.url_key = pg_temp.url_key(v.url))
  and coalesce(v.deadline, v.starts_at) >= current_date;

-- Source: https://hack-nation.ai/start
insert into opportunities (title, type, organizer, location, url, starts_at, deadline, description, submitted_by)
select v.*, pg_temp.seed_admin()
from (values (
  'Hack-Nation Global AI Hackathon 8', 'hackathon'::opportunity_type, 'Hack-Nation', 'Online and global hubs',
  'https://hack-nation.ai/start', '2027-02-27'::date, null::date,
  'A two-day AI hackathon held online and at local hubs, hosted with MIT groups. Teams of 1-4; you can join remotely from anywhere.'
)) v(title, type, organizer, location, url, starts_at, deadline, description)
where not exists (select 1 from opportunities o where o.url_key = pg_temp.url_key(v.url))
  and coalesce(v.deadline, v.starts_at) >= current_date;

-- Source: https://www.colosseum.com/eternal
insert into opportunities (title, type, organizer, location, url, starts_at, deadline, description, submitted_by)
select v.*, pg_temp.seed_admin()
from (values (
  'Colosseum Eternal', 'hackathon'::opportunity_type, 'Colosseum', 'Online',
  'https://www.colosseum.com/eternal', null::date, '2027-03-20'::date,
  'A four-week online sprint for building a crypto project on Solana; you choose when to start. Open to crypto developers and startup founders.'
)) v(title, type, organizer, location, url, starts_at, deadline, description)
where not exists (select 1 from opportunities o where o.url_key = pg_temp.url_key(v.url))
  and coalesce(v.deadline, v.starts_at) >= current_date;

commit;
