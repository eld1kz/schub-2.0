-- The admin area (/admin). Run once in Supabase Dashboard → SQL Editor, after team-edit.sql, right BEFORE
-- deploying the app version that uses it (the app before it reads opportunity_reports, which this moves into
-- reports; until the new version is live, reporting an event from the old one fails quietly). Safe to run twice.
--
-- 1. is_admin() now also needs a session verified with a second factor: the JWT's aal claim is 'aal2'. Every admin
--    policy and admin function checks it, so an admin signed in with Google alone has no admin powers until they
--    enter their 6-digit code. admin_access() tells the app which of these the caller is ('admin', 'code' for an
--    admin who still has to enter the code, 'setup' for an admin with no authenticator yet, or 'none').
-- 2. admin_actions: the audit log. Written only by the admin_* functions below, in the same transaction as the
--    change it records, so nothing an admin does can skip it. Nobody can update or delete a row: there's no
--    policy or grant for it, and a trigger refuses it even for the service role and the SQL Editor.
-- 3. Admins act only through those functions. The policy that let admins update or delete opportunities directly
--    is gone, and an opportunity can't be added already featured (a restrictive policy of its own, so it doesn't
--    replace the insert policy of team-entries.sql or any later file).
-- 4. reports: one table for people, teams and events. opportunity_reports moves in here and is dropped. 3 open
--    reports still hide a live event. A report goes when what it's about is deleted.
-- 5. suspensions: a suspended member can read but can't write anything. A restrictive policy on every table (and
--    on Storage) refuses their inserts, updates and deletes, and they can't delete their account while suspended.
--    A table added later needs the same three policies (see the loop below).
-- 6. profiles.hidden_at and teams.hidden_at: hidden by an admin; the app stops showing them to anyone else. Only
--    the admin functions can set them.
-- 7. visits: how many times a team link was opened from a story image (?ref=story) or a shared link (?ref=link),
--    per day. Counts only, nothing about who.
-- 8. Imports (opportunity-engine.sql) are reviewed through admin_review_import, and events edited through
--    admin_edit_event, which takes the engine's columns too; both mark the row reviewed, as the importer expects.
--
-- No function here adds or removes admins: that stays in the SQL Editor (fix_admin.sql).

-- 1. Admins need a second factor ---------------------------------------------------------------------------

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (select 1 from admins where user_id = auth.uid());
$$;

create or replace function admin_access()
returns text language sql stable security definer set search_path = public as $$
  select case
    when not exists (select 1 from admins where user_id = auth.uid()) then 'none'
    when coalesce(auth.jwt() ->> 'aal', '') = 'aal2' then 'admin'
    when exists (select 1 from auth.mfa_factors where user_id = auth.uid() and factor_type = 'totp' and status = 'verified') then 'code'
    else 'setup'
  end;
$$;
revoke execute on function admin_access() from public, anon;
grant execute on function admin_access() to authenticated;

-- 2. The audit log ------------------------------------------------------------------------------------------

create table if not exists admin_actions (
  id          bigint      generated always as identity primary key,
  -- No foreign key: the log outlives the admin's account
  admin_id    uuid        not null,
  action      text        not null check (action in ('hide', 'restore', 'suspend', 'unsuspend', 'dismiss', 'feature', 'unfeature', 'edit', 'approve', 'reject')),
  target_type text        not null check (target_type in ('person', 'team', 'event')),
  target_id   uuid        not null,
  reason      text        not null default '' check (length(reason) <= 500),
  details     jsonb       not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists admin_actions_newest on admin_actions (created_at desc);

alter table admin_actions enable row level security;

drop policy if exists "Admins read the log" on admin_actions;
create policy "Admins read the log"
  on admin_actions for select to authenticated using (is_admin());

revoke insert, update, delete, truncate on admin_actions from public, anon, authenticated, service_role;

create or replace function refuse_log_change()
returns trigger language plpgsql as $$
begin
  raise exception 'The admin log can''t be changed.' using errcode = '42501';
end;
$$;

drop trigger if exists admin_actions_append_only on admin_actions;
create trigger admin_actions_append_only
  before update or delete on admin_actions
  for each row execute procedure refuse_log_change();

drop trigger if exists admin_actions_no_truncate on admin_actions;
create trigger admin_actions_no_truncate
  before truncate on admin_actions
  for each statement execute procedure refuse_log_change();

-- 3. Admins act only through functions ----------------------------------------------------------------------

drop policy if exists "Admins can hide, restore or remove" on opportunities;

drop policy if exists "Submitters and admins can delete" on opportunities;
drop policy if exists "Submitters can delete" on opportunities;
create policy "Submitters can delete"
  on opportunities for delete to authenticated using (submitted_by = auth.uid());

-- Nobody adds one already featured: admins feature it afterwards, which is logged. A policy of its own, so the
-- insert policy itself (team-entries.sql, or a later file) stays as it is.
drop policy if exists "New opportunities aren't featured" on opportunities;
create policy "New opportunities aren't featured"
  on opportunities as restrictive for insert to authenticated with check (not featured);

-- 4. Reports ------------------------------------------------------------------------------------------------

create table if not exists reports (
  id          uuid        primary key default gen_random_uuid(),
  target_type text        not null check (target_type in ('person', 'team', 'event')),
  target_id   uuid        not null,
  reporter_id uuid        not null default auth.uid() references profiles(id) on delete cascade,
  reason      text        not null,
  note        text        not null default '' check (length(note) <= 500),
  status      text        not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  unique (target_type, target_id, reporter_id),
  -- The reasons each kind can be reported for (lib/reports.ts has the same lists)
  constraint reports_reason_known check (
    case target_type
      when 'event' then reason in ('fake', 'duplicate', 'expired', 'other')
      else reason in ('spam', 'fake', 'harassment', 'inappropriate', 'other')
    end
  )
);

create index if not exists reports_queue on reports (status, created_at desc);
create index if not exists reports_target on reports (target_type, target_id);

alter table reports enable row level security;

drop policy if exists "Reporters see their own reports; admins see all" on reports;
create policy "Reporters see their own reports; admins see all"
  on reports for select to authenticated using (reporter_id = auth.uid() or is_admin());

-- Something that exists, and not yourself or your own team
drop policy if exists "Members report as themselves" on reports;
create policy "Members report as themselves"
  on reports for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and case target_type
      when 'person' then target_id <> auth.uid() and exists (select 1 from profiles where id = target_id)
      when 'team' then exists (select 1 from teams where id = target_id and owner_id <> auth.uid())
      when 'event' then exists (select 1 from opportunities where id = target_id)
      else false
    end
  );

-- Reporters fill in only these; status and dates are the database's. Only the admin functions change a report.
revoke insert, update, delete on reports from anon, authenticated;
grant insert (target_type, target_id, reporter_id, reason, note) on reports to authenticated;

drop policy if exists "Guests can't add" on reports;
create policy "Guests can't add" on reports as restrictive for insert to authenticated with check (not is_guest());

-- Existing event reports move over. An event that's live again after 3 or more was restored by an admin, so its
-- reports were dismissed; a removed one's were acted on.
do $$
begin
  if to_regclass('public.opportunity_reports') is not null then
    insert into reports (target_type, target_id, reporter_id, reason, status, created_at, resolved_at)
    select 'event', r.opportunity_id, r.user_id, r.reason::text, s.status, r.created_at,
           case when s.status <> 'open' then now() end
    from opportunity_reports r
    join opportunities o on o.id = r.opportunity_id
    cross join lateral (
      select case
        when o.status = 'removed' then 'actioned'
        when o.status = 'live' and (select count(*) from opportunity_reports x where x.opportunity_id = r.opportunity_id) >= 3 then 'dismissed'
        else 'open'
      end as status
    ) s
    on conflict do nothing;
    drop table opportunity_reports;
  end if;
end;
$$;

drop function if exists hide_reported_opportunity();
drop type if exists report_reason;

-- 3 open reports hide a live event until an admin restores it
create or replace function hide_reported_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.target_type = 'event' and (
    select count(*) from reports where target_type = 'event' and target_id = new.target_id and status = 'open'
  ) >= 3 then
    update opportunities set status = 'hidden' where id = new.target_id and status = 'live';
  end if;
  return new;
end;
$$;

drop trigger if exists reports_hide_event on reports;
create trigger reports_hide_event
  after insert on reports
  for each row execute procedure hide_reported_event();

-- Reports about something deleted go with it
create or replace function forget_reports()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from reports where target_type = tg_argv[0] and target_id = old.id;
  return old;
end;
$$;

drop trigger if exists profiles_forget_reports on profiles;
create trigger profiles_forget_reports after delete on profiles for each row execute procedure forget_reports('person');
drop trigger if exists teams_forget_reports on teams;
create trigger teams_forget_reports after delete on teams for each row execute procedure forget_reports('team');
drop trigger if exists opportunities_forget_reports on opportunities;
create trigger opportunities_forget_reports after delete on opportunities for each row execute procedure forget_reports('event');

-- 5. Suspensions --------------------------------------------------------------------------------------------

create table if not exists suspensions (
  user_id    uuid        primary key references profiles(id) on delete cascade,
  reason     text        not null check (length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table suspensions enable row level security;

drop policy if exists "Members see their own suspension; admins see all" on suspensions;
create policy "Members see their own suspension; admins see all"
  on suspensions for select to authenticated using (user_id = auth.uid() or is_admin());

revoke insert, update, delete on suspensions from anon, authenticated;

create or replace function is_suspended()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from suspensions where user_id = auth.uid());
$$;

-- Every table with row level security, this one included. A write has to pass these as well as its own policy.
do $$
declare
  t text;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  loop
    execute format('drop policy if exists "Suspended members can''t add" on %I', t);
    execute format('drop policy if exists "Suspended members can''t edit" on %I', t);
    execute format('drop policy if exists "Suspended members can''t delete" on %I', t);
    execute format('create policy "Suspended members can''t add" on %I as restrictive for insert to authenticated with check (not is_suspended())', t);
    execute format('create policy "Suspended members can''t edit" on %I as restrictive for update to authenticated using (not is_suspended())', t);
    execute format('create policy "Suspended members can''t delete" on %I as restrictive for delete to authenticated using (not is_suspended())', t);
  end loop;
end;
$$;

drop policy if exists "Suspended members can't upload" on storage.objects;
create policy "Suspended members can't upload" on storage.objects
  as restrictive for insert to authenticated with check (not public.is_suspended());
drop policy if exists "Suspended members can't replace files" on storage.objects;
create policy "Suspended members can't replace files" on storage.objects
  as restrictive for update to authenticated using (not public.is_suspended());
drop policy if exists "Suspended members can't delete files" on storage.objects;
create policy "Suspended members can't delete files" on storage.objects
  as restrictive for delete to authenticated using (not public.is_suspended());

-- As in delete-account.sql, plus: not while suspended
create or replace function account_deletion_blocker(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from suspensions where user_id = uid)
    then 'Your account is suspended, so it can''t be deleted right now.'
    when exists (select 1 from admins where user_id = uid)
     and not exists (
       select 1 from admins a join auth.users u on u.id = a.user_id
       where a.user_id <> uid and not coalesce(u.is_anonymous, false)
     )
    then 'You''re the only admin. Make someone else an admin before deleting your account.'
    else ''
  end;
$$;
revoke execute on function account_deletion_blocker(uuid) from public, anon, authenticated;

-- 6. Hidden people and teams --------------------------------------------------------------------------------

alter table profiles add column if not exists hidden_at timestamptz;
alter table teams add column if not exists hidden_at timestamptz;

-- profiles is readable column by column (contact.sql, public-read.sql)
grant select (hidden_at) on profiles to anon, authenticated;

-- People update their own profile row, but never this column. (Teams: owners may update only roles and role_notes.)
create or replace function keep_hidden_at()
returns trigger language plpgsql as $$
begin
  if new.hidden_at is distinct from old.hidden_at and current_user in ('anon', 'authenticated') then
    raise exception 'Only an admin can hide or show a profile.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_keep_hidden_at on profiles;
create trigger profiles_keep_hidden_at
  before update on profiles
  for each row execute procedure keep_hidden_at();

-- 7. Visits by share link -----------------------------------------------------------------------------------

create table if not exists visits (
  day   date   not null,
  ref   text   not null check (ref in ('story', 'link')),
  count bigint not null default 0,
  primary key (day, ref)
);

alter table visits enable row level security;
revoke all on visits from anon, authenticated;

-- Called by the proxy when a team page is opened with ?ref=story or ?ref=link
create or replace function count_visit(source text)
returns void language sql security definer set search_path = public as $$
  insert into visits (day, ref, count)
  select current_date, source, 1 where source in ('story', 'link')
  on conflict (day, ref) do update set count = visits.count + 1;
$$;
revoke execute on function count_visit(text) from public;
grant execute on function count_visit(text) to anon, authenticated;

-- 8. Admin functions ----------------------------------------------------------------------------------------
-- Each one checks is_admin(), does one thing, and writes exactly one log row. The helpers below them aren't
-- callable through the API.

-- Refuses anyone but an MFA-verified admin; returns the trimmed reason, which hiding and suspending require
create or replace function admin_guard(reason text, required boolean)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  why text := trim(coalesce(reason, ''));
begin
  if not is_admin() then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  if required and why = '' then
    raise exception 'Give a reason.' using errcode = '22023';
  end if;
  if length(why) > 500 then
    raise exception 'Keep the reason to 500 characters.' using errcode = '22023';
  end if;
  return why;
end;
$$;

create or replace function log_admin_action(act text, kind text, target uuid, reason text, details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into admin_actions (admin_id, action, target_type, target_id, reason, details)
  values (auth.uid(), act, kind, target, reason, coalesce(details, '{}'));
$$;

-- Hides or shows a person, team or event; returns what it was before ('visible', 'hidden', or an event's status)
create or replace function set_hidden(kind text, target uuid, hide boolean)
returns text language plpgsql security definer set search_path = public as $$
declare
  before text;
begin
  if kind = 'event' then
    select status::text into before from opportunities where id = target for update;
    if not found then raise exception 'That event doesn''t exist.' using errcode = 'P0002'; end if;
    update opportunities set status = (case when hide then 'hidden' else 'live' end)::opportunity_status where id = target;
  elsif kind = 'team' then
    select case when hidden_at is null then 'visible' else 'hidden' end into before from teams where id = target for update;
    if not found then raise exception 'That team doesn''t exist.' using errcode = 'P0002'; end if;
    update teams set hidden_at = case when hide then coalesce(hidden_at, now()) end where id = target;
  elsif kind = 'person' then
    select case when hidden_at is null then 'visible' else 'hidden' end into before from profiles where id = target for update;
    if not found then raise exception 'That person doesn''t exist.' using errcode = 'P0002'; end if;
    update profiles set hidden_at = case when hide then coalesce(hidden_at, now()) end where id = target;
  else
    raise exception 'Unknown kind %', kind using errcode = '22023';
  end if;
  return before;
end;
$$;

-- Closes the open reports about something; returns their ids
create or replace function close_reports(kind text, target uuid, outcome text)
returns uuid[] language plpgsql security definer set search_path = public as $$
declare
  ids uuid[];
begin
  with closed as (
    update reports set status = outcome, resolved_at = now()
    where target_type = kind and target_id = target and status = 'open'
    returning id
  )
  select coalesce(array_agg(id), '{}') into ids from closed;
  return ids;
end;
$$;

revoke execute on function admin_guard(text, boolean) from public, anon, authenticated, service_role;
revoke execute on function log_admin_action(text, text, uuid, text, jsonb) from public, anon, authenticated, service_role;
revoke execute on function set_hidden(text, uuid, boolean) from public, anon, authenticated, service_role;
revoke execute on function close_reports(text, uuid, text) from public, anon, authenticated, service_role;

-- Hide a person, team or event; its open reports count as acted on
create or replace function admin_hide(kind text, target uuid, reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  why text := admin_guard(reason, true);
  before text := set_hidden(kind, target, true);
  closed uuid[] := close_reports(kind, target, 'actioned');
begin
  perform log_admin_action('hide', kind, target, why, jsonb_build_object('before', before, 'after', 'hidden', 'reports', to_jsonb(closed)));
end;
$$;

-- Show it again (an event goes back to live, also from removed)
create or replace function admin_restore(kind text, target uuid, reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  why text := admin_guard(reason, false);
  before text := set_hidden(kind, target, false);
begin
  perform log_admin_action('restore', kind, target, why, jsonb_build_object('before', before, 'after', case when kind = 'event' then 'live' else 'visible' end));
end;
$$;

-- Suspend a member. `report`: the report this answers, whose open reports close with it (a team's or an event's
-- reports, when the person suspended is its owner or submitter).
create or replace function admin_suspend(person uuid, reason text, report uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  why text := admin_guard(reason, true);
  closed uuid[];
  r reports%rowtype;
begin
  if not exists (select 1 from profiles where id = person) then
    raise exception 'That person doesn''t exist.' using errcode = 'P0002';
  end if;
  if exists (select 1 from admins where user_id = person) then
    raise exception 'Admins can''t be suspended.' using errcode = '22023';
  end if;
  if exists (select 1 from suspensions where user_id = person) then
    raise exception 'Already suspended.' using errcode = '22023';
  end if;
  insert into suspensions (user_id, reason) values (person, why);
  closed := close_reports('person', person, 'actioned');
  if report is not null then
    select * into r from reports where id = report;
    if found then
      closed := closed || close_reports(r.target_type, r.target_id, 'actioned');
    end if;
  end if;
  perform log_admin_action('suspend', 'person', person, why, jsonb_build_object('reports', to_jsonb(closed)));
end;
$$;

create or replace function admin_unsuspend(person uuid, reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  why text := admin_guard(reason, false);
  was text;
begin
  delete from suspensions where user_id = person returning suspensions.reason into was;
  if not found then
    raise exception 'Not suspended.' using errcode = '22023';
  end if;
  perform log_admin_action('unsuspend', 'person', person, why, jsonb_build_object('suspended_for', was));
end;
$$;

-- Nothing wrong: every open report about the same thing is dismissed
create or replace function admin_dismiss(report uuid, reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  why text := admin_guard(reason, true);
  r reports%rowtype;
  closed uuid[];
begin
  select * into r from reports where id = report;
  if not found or r.status <> 'open' then
    raise exception 'That report isn''t open.' using errcode = '22023';
  end if;
  closed := close_reports(r.target_type, r.target_id, 'dismissed');
  perform log_admin_action('dismiss', r.target_type, r.target_id, why, jsonb_build_object('reports', to_jsonb(closed)));
end;
$$;

create or replace function admin_set_featured(event uuid, featured boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  before boolean;
begin
  perform admin_guard('', false);
  select o.featured into before from opportunities o where o.id = event for update;
  if not found then
    raise exception 'That event doesn''t exist.' using errcode = 'P0002';
  end if;
  update opportunities o set featured = coalesce(admin_set_featured.featured, false) where o.id = event;
  perform log_admin_action(case when featured then 'feature' else 'unfeature' end, 'event', event, '',
    jsonb_build_object('before', before, 'after', coalesce(featured, false)));
end;
$$;

-- Edits an event (the admin edit page, also "Edit" on an import). `fields` holds the columns to change, as the app's
-- form sends them; anything else is refused. Saving counts as reviewing it: an import goes live and the importer
-- stops overwriting it (opportunity-engine.sql). The log keeps the fields that changed, before and after.
drop function if exists admin_edit_event(uuid, text, opportunity_type, text, text, boolean, text, date, date, date, text, text);
create or replace function admin_edit_event(event uuid, fields jsonb, reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  why text := admin_guard(reason, false);
  f jsonb := coalesce(fields, '{}');
  editable text[] := array['title', 'type', 'url', 'organizer', 'city', 'country', 'online', 'languages', 'eligibility',
                           'eligibility_note', 'starts_at', 'deadline', 'ends_at', 'description'];
  before jsonb;
  after jsonb;
  changed text[];
begin
  if jsonb_typeof(f) <> 'object' or exists (select 1 from jsonb_object_keys(f) k where k <> all (editable)) then
    raise exception 'Unknown field.' using errcode = '22023';
  end if;
  select to_jsonb(o) into before from opportunities o where o.id = event for update;
  if not found then
    raise exception 'That event doesn''t exist.' using errcode = 'P0002';
  end if;
  update opportunities o set
    title            = case when f ? 'title' then trim(f ->> 'title') else o.title end,
    type             = case when f ? 'type' then (f ->> 'type')::opportunity_type else o.type end,
    url              = case when f ? 'url' then trim(f ->> 'url') else o.url end,
    organizer        = case when f ? 'organizer' then trim(coalesce(f ->> 'organizer', '')) else o.organizer end,
    city             = case when f ? 'city' then trim(coalesce(f ->> 'city', '')) else o.city end,
    country          = case when f ? 'country' then nullif(f ->> 'country', '') else o.country end,
    online           = case when f ? 'online' then coalesce((f ->> 'online')::boolean, false) else o.online end,
    languages        = case when f ? 'languages' then array(select jsonb_array_elements_text(coalesce(f -> 'languages', '[]'))) else o.languages end,
    eligibility      = case when f ? 'eligibility' then coalesce(f ->> 'eligibility', 'anyone') else o.eligibility end,
    eligibility_note = case when f ? 'eligibility_note' then coalesce(f ->> 'eligibility_note', '') else o.eligibility_note end,
    starts_at        = case when f ? 'starts_at' then (f ->> 'starts_at')::date else o.starts_at end,
    deadline         = case when f ? 'deadline' then (f ->> 'deadline')::date else o.deadline end,
    ends_at          = case when f ? 'ends_at' then (f ->> 'ends_at')::date else o.ends_at end,
    description      = case when f ? 'description' then coalesce(f ->> 'description', '') else o.description end,
    needs_review     = false,
    reviewed_at      = now()
  where o.id = event
  returning to_jsonb(o) into after;
  select coalesce(array_agg(k), '{}') into changed from unnest(editable || array['needs_review']) k where before -> k is distinct from after -> k;
  perform log_admin_action('edit', 'event', event, why, jsonb_build_object(
    'before', (select coalesce(jsonb_object_agg(k, before -> k), '{}') from unnest(changed) k),
    'after', (select coalesce(jsonb_object_agg(k, after -> k), '{}') from unnest(changed) k)
  ));
end;
$$;

-- An imported event waiting for review (opportunity-engine.sql): approve puts it on the lists; reject removes it,
-- which needs a reason. Either way it's reviewed, so the importer won't bring it back or overwrite it.
create or replace function admin_review_import(event uuid, decision text, reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  why text := admin_guard(reason, decision = 'reject');
  was text;
begin
  if decision is null or decision not in ('approve', 'reject') then
    raise exception 'Approve or reject.' using errcode = '22023';
  end if;
  select status::text into was from opportunities where id = event and needs_review for update;
  if not found then
    raise exception 'That import isn''t waiting for review.' using errcode = '22023';
  end if;
  update opportunities
  set needs_review = false, reviewed_at = now(), status = (case when decision = 'reject' then 'removed' else status::text end)::opportunity_status
  where id = event;
  perform log_admin_action(decision, 'event', event, why, jsonb_build_object(
    'before', jsonb_build_object('needs_review', true, 'status', was),
    'after', jsonb_build_object('needs_review', false, 'status', case when decision = 'reject' then 'removed' else was end)
  ));
end;
$$;

-- Read-only, so not logged ----------------------------------------------------------------------------------

-- Overview: counts only, nothing about any one person
create or replace function admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform admin_guard('', false);
  return jsonb_build_object(
    'signups', (
      select jsonb_agg(jsonb_build_object('day', d.day, 'count', coalesce(n.count, 0)) order by d.day)
      from (select g::date as day from generate_series(current_date - 29, current_date, interval '1 day') g) d
      left join (
        select created_at::date as day, count(*) as count from auth.users
        where not coalesce(is_anonymous, false) and created_at >= current_date - 29
        group by 1
      ) n on n.day = d.day
    ),
    'members', (select count(*) from profiles p join auth.users u on u.id = p.id where not coalesce(u.is_anonymous, false)),
    'profiles_completed', (
      select count(*) from profiles p join auth.users u on u.id = p.id
      where not coalesce(u.is_anonymous, false) and p.university <> '' and cardinality(p.skills) > 0
    ),
    'teams', (select count(*) from teams),
    'teams_formed', (select count(*) from teams t where exists (select 1 from team_applications a where a.team_id = t.id and a.status = 'accepted')),
    'applications_accepted', (select count(*) from team_applications where direction = 'application' and status = 'accepted'),
    'invites_accepted', (select count(*) from team_applications where direction = 'invite' and status = 'accepted'),
    'visits', jsonb_build_object(
      'story', (select coalesce(sum(count), 0) from visits where ref = 'story' and day >= current_date - 29),
      'link', (select coalesce(sum(count), 0) from visits where ref = 'link' and day >= current_date - 29)
    ),
    'open_reports', (select count(*) from reports where status = 'open'),
    'suspended', (select count(*) from suspensions)
  );
end;
$$;

-- One person's activity, as counts
create or replace function admin_person_summary(person uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform admin_guard('', false);
  if not exists (select 1 from profiles where id = person) then
    return null;
  end if;
  return jsonb_build_object(
    'joined', (select created_at from auth.users where id = person),
    'last_sign_in', (select last_sign_in_at from auth.users where id = person),
    'two_factor', exists (select 1 from auth.mfa_factors where user_id = person and status = 'verified'),
    'admin', exists (select 1 from admins where user_id = person),
    'hidden_at', (select hidden_at from profiles where id = person),
    'suspension', (select jsonb_build_object('reason', reason, 'since', created_at) from suspensions where user_id = person),
    'teams_owned', (select count(*) from teams where owner_id = person),
    'teams_joined', (select count(*) from team_applications where user_id = person and status = 'accepted'),
    'applications', (select count(*) from team_applications where user_id = person and direction = 'application'),
    'connections', (select count(*) from connections where status = 'accepted' and person in (sender_id, receiver_id)),
    'events_added', (select count(*) from opportunities where submitted_by = person),
    'reports_made', (select count(*) from reports where reporter_id = person),
    'reports_against', (select count(*) from reports where target_type = 'person' and target_id = person)
  );
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'admin_hide(text, uuid, text)', 'admin_restore(text, uuid, text)', 'admin_suspend(uuid, text, uuid)',
    'admin_unsuspend(uuid, text)', 'admin_dismiss(uuid, text)', 'admin_set_featured(uuid, boolean)',
    'admin_edit_event(uuid, jsonb, text)', 'admin_review_import(uuid, text, text)',
    'admin_overview()', 'admin_person_summary(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
