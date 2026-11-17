-- Portfolio profiles: photo, headline, links, projects and experience.
-- Run once in Supabase Dashboard → SQL Editor, after profile.sql.

-- Profile fields -----------------------------------------------------------------
-- profile.sql added three prompt answers and a small JSON list of project links.
-- Projects now have their own table and the prompts are gone.

alter table profiles
  drop column if exists prompt_teammate,
  drop column if exists prompt_build,
  drop column if exists prompt_ask,
  drop column if exists projects;

alter table profiles rename column building to headline;

alter table profiles
  add column if not exists github   text not null default '' check (github = '' or github ~ '^https?://'),
  add column if not exists linkedin text not null default '' check (linkedin = '' or linkedin ~ '^https?://'),
  add column if not exists website  text not null default '' check (website = '' or website ~ '^https?://');

-- contact.sql made profile columns readable one by one, so new ones need their own grant
grant select (github, linkedin, website) on profiles to authenticated;

-- Projects -------------------------------------------------------------------------

create table projects (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null default auth.uid() references profiles(id) on delete cascade,
  title       text        not null check (length(title) between 1 and 80),
  tagline     text        not null default '' check (length(tagline) <= 140),
  description text        not null default '' check (length(description) <= 600),
  role        text        not null default '' check (length(role) <= 60),
  -- Where it was built (a hackathon, a course, a club) and how it did there
  built_at    text        not null default '' check (length(built_at) <= 100),
  result      text        not null default '' check (length(result) <= 60),
  year        integer     check (year between 2000 and 2100),
  url         text        not null default '' check (url = '' or url ~ '^https?://'),
  repo_url    text        not null default '' check (repo_url = '' or repo_url ~ '^https?://'),
  image_url   text        not null default '',
  skills      text[]      not null default '{}',
  created_at  timestamptz not null default now()
);

alter table projects enable row level security;

create policy "Signed-in users can read projects"
  on projects for select to authenticated using (true);

create policy "Users add their own projects"
  on projects for insert to authenticated with check (user_id = auth.uid());

create policy "Users edit their own projects"
  on projects for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users delete their own projects"
  on projects for delete to authenticated using (user_id = auth.uid());

-- Experience -----------------------------------------------------------------------

create table experiences (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null default auth.uid() references profiles(id) on delete cascade,
  role        text        not null check (length(role) between 1 and 80),
  company     text        not null check (length(company) between 1 and 80),
  -- First day of the month; no end date means it's ongoing
  start_date  date        not null,
  end_date    date        check (end_date is null or end_date >= start_date),
  description text        not null default '' check (length(description) <= 600),
  created_at  timestamptz not null default now()
);

alter table experiences enable row level security;

create policy "Signed-in users can read experience"
  on experiences for select to authenticated using (true);

create policy "Users add their own experience"
  on experiences for insert to authenticated with check (user_id = auth.uid());

create policy "Users edit their own experience"
  on experiences for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users delete their own experience"
  on experiences for delete to authenticated using (user_id = auth.uid());

-- Images ----------------------------------------------------------------------------
-- One public bucket for profile photos and project images. Each user writes only to a
-- folder named after their own id.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Users upload images to their own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete their own images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
