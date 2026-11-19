-- Length limits on everything people type. Run once in Supabase Dashboard → SQL Editor, after awards.sql.
-- Safe to run twice.
--
-- Until now several columns had no limit at all. A member could save a 50 MB name, which then loaded into
-- every visitor's People page (one such name turned it into 40 MB of HTML) and was copied into every
-- notification they caused, so a few requests could fill the database. A visitor without an account could
-- do the same with a ~1 MB name, since new guests took their name from sign-up metadata they control.
--
-- The checks are added NOT VALID: every new or edited row has to pass, but existing rows aren't scanned,
-- so this can't fail on old data. To check old rows too, run the commented VALIDATE lines at the end.
-- The limits match (or are looser than) the forms, so nobody using the site hits them.

-- Total characters in a text[] column
create or replace function text_array_length(a text[])
returns integer language sql immutable as $$
  select coalesce(sum(length(x)), 0)::integer from unnest(a) x;
$$;

do $$
declare
  c record;
begin
  for c in select * from (values
    ('profiles',      'profiles_name_length',          'length(name) <= 80'),
    ('profiles',      'profiles_university_length',    'length(university) <= 120'),
    ('profiles',      'profiles_bio_length',           'length(bio) <= 2000'),
    ('profiles',      'profiles_avatar_url_length',    'length(avatar_url) <= 500'),
    ('profiles',      'profiles_links_length',         'length(github) <= 300 and length(linkedin) <= 300 and length(website) <= 300'),
    ('profiles',      'profiles_skills_size',          'cardinality(skills) <= 50 and text_array_length(skills) <= 1000'),
    ('profiles',      'profiles_interests_size',       'cardinality(interests) <= 20 and text_array_length(interests) <= 500'),
    ('profiles',      'profiles_looking_for_size',     'cardinality(looking_for) <= 20 and text_array_length(looking_for) <= 500'),
    ('projects',      'projects_links_length',         'length(url) <= 1000 and length(repo_url) <= 1000 and length(image_url) <= 500'),
    ('projects',      'projects_skills_size',          'cardinality(skills) <= 50 and text_array_length(skills) <= 1000'),
    ('experiences',   'experiences_skills_length',     'text_array_length(skills) <= 1000'),
    ('awards',        'awards_proof_url_length',       'length(proof_url) <= 1000'),
    ('teams',         'teams_roles_length',            'text_array_length(roles) <= 400'),
    ('opportunities', 'opportunities_text_length',     'length(organizer) <= 120 and length(location) <= 120 and length(url) <= 1000'),
    ('ideas',         'ideas_description_length',      'length(description) <= 2000'),
    ('ideas',         'ideas_skills_needed_size',      'cardinality(skills_needed) <= 20 and text_array_length(skills_needed) <= 500')
  ) as t(tbl, name, expr) loop
    execute format('alter table %I drop constraint if exists %I', c.tbl, c.name);
    execute format('alter table %I add constraint %I check (%s) not valid', c.tbl, c.name, c.expr);
  end loop;
end;
$$;

-- New accounts: guests get no name (nothing in the app gives them one), and a member's name from Google
-- is cut to the limit instead of failing the sign-up. Same as schema.sql otherwise.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name)
  values (new.id, case when new.is_anonymous then '' else left(coalesce(new.raw_user_meta_data->>'name', ''), 80) end);
  return new;
end;
$$;

-- To check existing rows as well (each fails, naming the constraint, if an old row is over the limit):
-- alter table profiles validate constraint profiles_name_length;
-- alter table profiles validate constraint profiles_university_length;
-- alter table profiles validate constraint profiles_bio_length;
-- alter table profiles validate constraint profiles_avatar_url_length;
-- alter table profiles validate constraint profiles_links_length;
-- alter table profiles validate constraint profiles_skills_size;
-- alter table profiles validate constraint profiles_interests_size;
-- alter table profiles validate constraint profiles_looking_for_size;
-- alter table projects validate constraint projects_links_length;
-- alter table projects validate constraint projects_skills_size;
-- alter table experiences validate constraint experiences_skills_length;
-- alter table awards validate constraint awards_proof_url_length;
-- alter table teams validate constraint teams_roles_length;
-- alter table opportunities validate constraint opportunities_text_length;
-- alter table ideas validate constraint ideas_description_length;
-- alter table ideas validate constraint ideas_skills_needed_size;
