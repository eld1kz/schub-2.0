-- Open to a team. Run once in Supabase Dashboard → SQL Editor, after delete-account.sql, and BEFORE deploying the
-- app version that uses it (the new pages select these columns and 404 without them). Safe to run twice.
--
-- 1. profiles.wanted_roles: the roles someone is open to joining a team as, from the fixed list in
--    src/lib/roles.ts. The switch for "open to a team" is the existing open_to_collaborate column.
-- 2. teams.role_notes: an optional short note per open role, like {"Designer": "Figma, mobile first"}.
--    New teams pick their roles from the same fixed list; existing teams keep their typed-in roles.

-- What someone is open to --------------------------------------------------------------------------------

alter table profiles add column if not exists wanted_roles text[] not null default '{}';

alter table profiles drop constraint if exists profiles_wanted_roles_known;
alter table profiles add constraint profiles_wanted_roles_known check (
  wanted_roles <@ array['Frontend', 'Backend', 'Full-stack', 'iOS', 'Android', 'ML / AI', 'Data', 'Designer', 'Product / PM', 'Marketing', 'Business']
  -- Containment ignores repeats, so cap the size too
  and cardinality(wanted_roles) <= 11
);

-- profiles is readable column by column (contact.sql, public-read.sql), so the new column needs its own grant.
-- Updating it is covered by "Users can update their own profile" (schema.sql).
grant select (wanted_roles) on profiles to anon, authenticated;

-- Notes on a team's open roles ------------------------------------------------------------------------------

-- Every key is one of the team's roles and every value a string of up to 80 characters
create or replace function role_notes_valid(notes jsonb, roles text[])
returns boolean language sql immutable set search_path = public as $$
  select jsonb_typeof(notes) = 'object'
     and not exists (
       select 1 from jsonb_each(notes) n
       where not (n.key = any (roles)) or jsonb_typeof(n.value) <> 'string' or length(n.value #>> '{}') > 80
     );
$$;

alter table teams add column if not exists role_notes jsonb not null default '{}';

alter table teams drop constraint if exists teams_role_notes_valid;
alter table teams add constraint teams_role_notes_valid check (role_notes_valid(role_notes, roles));
