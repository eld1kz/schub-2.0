-- Opportunity engine: where an event happens, its languages and who can join; events imported from other sites; and
-- "Fill from link". Run once in Supabase Dashboard → SQL Editor, after team-entries.sql, and BEFORE deploying the app
-- version that uses it (its pages select these columns). Safe to run twice.
--
-- 1. opportunities gets:
--    country           ISO 3166 two-letter code (KR, US); null when it's online only or not known
--    city              free text, '' when not known
--    languages         the fixed list in src/lib/languages.ts (known_languages() from languages.sql)
--    eligibility       'anyone', 'students', or 'country': only people in `country` can join; eligibility_note says more
--    inferred          which of country, city, online and languages an importer guessed rather than read from its source
-- 2. Imported events (src/lib/importers, run twice a day by .github/workflows/import-opportunities.yml with the service
--    role, which skips row level security):
--    source, external_id   where it came from and its id there; unique together
--    imported_at           when the importer last wrote it
--    needs_review          only admins see it until one approves it ("Review imports" on /opportunities)
--    reviewed_at           set when an admin approves or edits it; from then on the importer leaves it alone
--    People can't add rows that look imported, reviewed or waiting for review.
-- 3. link_fetches: "Fill from link" on /opportunities/new, up to 20 an hour per person.

-- 1. Place, languages, who can join ------------------------------------------------------------------------

alter table opportunities
  add column if not exists country          text,
  add column if not exists city             text    not null default '',
  add column if not exists languages        text[]  not null default '{}',
  add column if not exists eligibility      text    not null default 'anyone',
  add column if not exists eligibility_note text    not null default '',
  add column if not exists inferred         text[]  not null default '{}';

alter table opportunities drop constraint if exists opportunities_country_code;
alter table opportunities add constraint opportunities_country_code check (country is null or country ~ '^[A-Z]{2}$');
alter table opportunities drop constraint if exists opportunities_city_length;
alter table opportunities add constraint opportunities_city_length check (length(city) <= 80);
alter table opportunities drop constraint if exists opportunities_languages_known;
alter table opportunities add constraint opportunities_languages_known check (known_languages(languages) and no_repeats(languages));
-- A country restriction needs the country it's restricted to
alter table opportunities drop constraint if exists opportunities_eligibility_known;
alter table opportunities add constraint opportunities_eligibility_known check (
  eligibility in ('anyone', 'students', 'country') and length(eligibility_note) <= 300 and (eligibility <> 'country' or country is not null)
);
alter table opportunities drop constraint if exists opportunities_inferred_known;
alter table opportunities add constraint opportunities_inferred_known check (inferred <@ array['country', 'city', 'online', 'languages']);

-- 2. Imported events ---------------------------------------------------------------------------------------

alter table opportunities
  add column if not exists source       text,
  add column if not exists external_id  text,
  add column if not exists imported_at  timestamptz,
  add column if not exists needs_review boolean not null default false,
  add column if not exists reviewed_at  timestamptz;

-- Both or neither, from a known source. coalesce: a check that comes out null passes, and length(null) is null.
alter table opportunities drop constraint if exists opportunities_source_known;
alter table opportunities add constraint opportunities_source_known check (
  (source is null and external_id is null)
  or coalesce(source in ('hackclub', 'kaggle', 'kstartup', 'luma') and length(external_id) between 1 and 200, false)
);
alter table opportunities drop constraint if exists opportunities_source_external_key;
alter table opportunities add constraint opportunities_source_external_key unique (source, external_id);

-- As before, but waiting for review counts as not live: only the submitter (nobody, for imports) and admins see it
drop policy if exists "Live opportunities are visible; submitters see their own; admin" on opportunities;
create policy "Live opportunities are visible; submitters see their own; admin"
  on opportunities for select to anon, authenticated
  using ((status = 'live' and not needs_review) or submitted_by = auth.uid() or is_admin());

-- As in team-entries.sql, plus: nothing that only the importer and admins set
drop policy if exists "Users add opportunities as themselves" on opportunities;
create policy "Users add opportunities as themselves"
  on opportunities for insert to authenticated
  with check (
    submitted_by = auth.uid() and status = 'live' and (not featured or is_admin())
    and source is null and imported_at is null and not needs_review and reviewed_at is null and inferred = '{}'
  );

-- 3. "Fill from link" -------------------------------------------------------------------------------------------
-- One row per page fetched. No select policy: only the trigger below reads it.

create table if not exists link_fetches (
  user_id    uuid        not null default auth.uid() references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists link_fetches_user on link_fetches (user_id, created_at);

alter table link_fetches enable row level security;

drop policy if exists "Users log their own fetches" on link_fetches;
create policy "Users log their own fetches"
  on link_fetches for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Guests can't add" on link_fetches;
create policy "Guests can't add" on link_fetches as restrictive for insert to authenticated with check (not is_guest());

-- 20 an hour; rows older than a day are cleared as it goes
create or replace function check_link_fetch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from link_fetches where user_id = new.user_id and created_at < now() - interval '1 day';
  if (select count(*) from link_fetches where user_id = new.user_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'You can fill from a link 20 times an hour. Try again later.';
  end if;
  return new;
end;
$$;

drop trigger if exists link_fetches_limit on link_fetches;
create trigger link_fetches_limit
  before insert on link_fetches
  for each row execute procedure check_link_fetch();
