-- Richer profiles. Run once in Supabase Dashboard → SQL Editor, after teams.sql.
-- What you're building, three short prompts, and up to three project links.

alter table profiles
  add column if not exists building        text  not null default '' check (length(building) <= 100),
  add column if not exists prompt_teammate text  not null default '' check (length(prompt_teammate) <= 200),
  add column if not exists prompt_build    text  not null default '' check (length(prompt_build) <= 200),
  add column if not exists prompt_ask      text  not null default '' check (length(prompt_ask) <= 200),
  -- [{ "title": "...", "url": "https://..." }]
  add column if not exists projects        jsonb not null default '[]'
    check (jsonb_typeof(projects) = 'array' and jsonb_array_length(projects) <= 3);

-- contact.sql made profile columns readable one by one, so new ones need their own grant
grant select (building, prompt_teammate, prompt_build, prompt_ask, projects) on profiles to authenticated;
