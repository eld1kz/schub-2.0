-- Languages and availability. Run once in Supabase Dashboard → SQL Editor, after open-to-team.sql, and BEFORE
-- deploying the app version that uses it (its pages select these columns). Safe to run twice.
--
-- Profiles get the languages someone works in, how many hours a week they have, how they like to work and their city.
-- Teams get their working languages and work mode. Languages, hours and work modes come from fixed lists
-- (src/lib/languages.ts); empty means not set.

-- The fixed list of languages, for the checks below
create or replace function known_languages(languages text[])
returns boolean language sql immutable set search_path = public as $$
  select languages <@ array['Korean', 'English', 'Russian', 'Kazakh', 'Uzbek', 'Chinese', 'Japanese', 'Vietnamese', 'Mongolian', 'French', 'Spanish', 'German'];
$$;

-- True when no value appears twice. Containment (<@) ignores repeats, so the list checks use this too.
create or replace function no_repeats(a text[])
returns boolean language sql immutable set search_path = public as $$
  select cardinality(a) = (select count(distinct v) from unnest(a) v);
$$;

-- Profiles -------------------------------------------------------------------------------------------------

alter table profiles
  add column if not exists languages      text[] not null default '{}',
  add column if not exists hours_per_week text   not null default '',
  add column if not exists work_mode      text   not null default '',
  add column if not exists city           text   not null default '';

alter table profiles drop constraint if exists profiles_languages_known;
alter table profiles add constraint profiles_languages_known check (known_languages(languages) and no_repeats(languages));
alter table profiles drop constraint if exists profiles_hours_per_week_known;
alter table profiles add constraint profiles_hours_per_week_known check (hours_per_week in ('', 'Under 5', '5-10', '10-20', '20+'));
alter table profiles drop constraint if exists profiles_work_mode_known;
alter table profiles add constraint profiles_work_mode_known check (work_mode in ('', 'In person', 'Remote', 'Either'));
alter table profiles drop constraint if exists profiles_city_length;
alter table profiles add constraint profiles_city_length check (length(city) <= 60);

-- open-to-team.sql capped wanted_roles at 11 but let a role repeat ("Designer, Designer"); now no repeats either
alter table profiles drop constraint if exists profiles_wanted_roles_no_repeats;
alter table profiles add constraint profiles_wanted_roles_no_repeats check (no_repeats(wanted_roles));

-- profiles is readable column by column (contact.sql, public-read.sql), so new columns need their own grant.
-- Updating them is covered by "Users can update their own profile" (schema.sql).
grant select (languages, hours_per_week, work_mode, city) on profiles to anon, authenticated;

-- Teams ----------------------------------------------------------------------------------------------------

alter table teams
  add column if not exists languages text[] not null default '{}',
  add column if not exists work_mode text   not null default '';

alter table teams drop constraint if exists teams_languages_known;
alter table teams add constraint teams_languages_known check (known_languages(languages) and no_repeats(languages));
alter table teams drop constraint if exists teams_work_mode_known;
alter table teams add constraint teams_work_mode_known check (work_mode in ('', 'In person', 'Remote', 'Either'));
