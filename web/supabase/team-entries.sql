-- Teams entering events, and featured events. Run once in Supabase Dashboard → SQL Editor, after shared-projects.sql,
-- and BEFORE deploying the app version that uses it. Safe to run twice.
--
-- 1. team_entries: a team entered in an event (an opportunity), one row per team per event, with how far it got:
--    going → registered → submitted → placed. Anyone can read them; only the team's owner adds, changes or removes
--    one, and only for a live event that hasn't ended. Every existing teams.opportunity_id becomes an entry with
--    status 'going'. A team's "current event" (its soonest upcoming entry) is worked out by the app (lib/teams.ts).
--    Accepted members are notified when their team enters an event.
--
--    teams.opportunity_id stays for now: the app version before this one still reads and writes it. Until that
--    version is gone, a trigger turns a new team's opportunity_id into an entry. Once the app that uses team_entries
--    is deployed, nothing reads the column; drop it then with:
--      drop trigger if exists teams_enter_event on teams;
--      drop function if exists enter_team_from_column();
--      alter table teams drop column opportunity_id;
--
-- 2. Owners can change their team's open roles (roles and role_notes only), so entering an event can adjust them.
--
-- 3. opportunities.featured: featured events come first on /opportunities and on the landing page. Only admins can
--    set it (the existing "Admins can hide, restore or remove" policy is the only update policy on opportunities;
--    the insert policy below stops anyone else adding one already featured).
--
-- 4. team_project_open (shared-projects.sql) now reads entries: a team can record what it built once one of its
--    events has ended, or any time when it has none.

-- Entries ---------------------------------------------------------------------------------------------------

create table if not exists team_entries (
  team_id        uuid        not null references teams(id) on delete cascade,
  opportunity_id uuid        not null references opportunities(id) on delete cascade,
  status         text        not null default 'going' check (status in ('going', 'registered', 'submitted', 'placed')),
  created_at     timestamptz not null default now(),
  primary key (team_id, opportunity_id)
);

create index if not exists team_entries_opportunity on team_entries (opportunity_id);

alter table team_entries enable row level security;

-- Existing teams keep their event, as an entry
insert into team_entries (team_id, opportunity_id, status, created_at)
select id, opportunity_id, 'going', created_at from teams where opportunity_id is not null
on conflict do nothing;

drop policy if exists "Everyone can read entries" on team_entries;
create policy "Everyone can read entries"
  on team_entries for select to anon, authenticated using (true);

-- A live event that hasn't ended: its end, else its start, else its deadline is today or later (no dates: open)
drop policy if exists "Owners enter their team in a live, upcoming event" on team_entries;
create policy "Owners enter their team in a live, upcoming event"
  on team_entries for insert to authenticated
  with check (
    exists (select 1 from teams t where t.id = team_id and t.owner_id = auth.uid())
    and exists (
      select 1 from opportunities o
      where o.id = opportunity_id and o.status = 'live' and coalesce(o.ends_at, o.starts_at, o.deadline, current_date) >= current_date
    )
  );

drop policy if exists "Owners change their entry's status" on team_entries;
create policy "Owners change their entry's status"
  on team_entries for update to authenticated
  using (exists (select 1 from teams t where t.id = team_id and t.owner_id = auth.uid()))
  with check (exists (select 1 from teams t where t.id = team_id and t.owner_id = auth.uid()));

-- Only the status changes; an entry can't move to another team or event
revoke update on team_entries from anon, authenticated;
grant update (status) on team_entries to authenticated;

drop policy if exists "Owners withdraw their entry" on team_entries;
create policy "Owners withdraw their entry"
  on team_entries for delete to authenticated
  using (exists (select 1 from teams t where t.id = team_id and t.owner_id = auth.uid()));

-- Guests can't write (same restrictive policies as in auth.sql)
drop policy if exists "Guests can't add" on team_entries;
drop policy if exists "Guests can't edit" on team_entries;
drop policy if exists "Guests can't delete" on team_entries;
create policy "Guests can't add" on team_entries as restrictive for insert to authenticated with check (not is_guest());
create policy "Guests can't edit" on team_entries as restrictive for update to authenticated using (not is_guest());
create policy "Guests can't delete" on team_entries as restrictive for delete to authenticated using (not is_guest());

-- Until the old app is gone: a team posted with opportunity_id gets its entry
create or replace function enter_team_from_column()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.opportunity_id is not null then
    insert into team_entries (team_id, opportunity_id) values (new.id, new.opportunity_id) on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists teams_enter_event on teams;
create trigger teams_enter_event
  after insert on teams
  for each row execute procedure enter_team_from_column();

-- Notifications ---------------------------------------------------------------------------------------------
-- Every type so far (shared-projects.sql), plus team_entered

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in (
  'team_application', 'application_accepted', 'application_declined', 'connection_request', 'connection_accepted',
  'award_tag', 'award_changed', 'team_owner_changed', 'team_invite', 'invite_accepted', 'invite_declined',
  'shared_project', 'shared_project_changed', 'team_entered'
));

-- Accepted members hear that their team entered an event. Created after the backfill above, so moving the old
-- column over notifies nobody.
create or replace function notify_team_entry()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  team teams%rowtype;
  event text;
  member uuid;
begin
  select * into team from teams where id = new.team_id;
  select title into event from opportunities where id = new.opportunity_id;
  for member in select user_id from team_applications where team_id = new.team_id and status = 'accepted' and user_id <> team.owner_id loop
    perform notify(member, team.owner_id, 'team_entered', format('Your team entered %s', event), '/teams/' || team.id);
  end loop;
  return new;
end;
$$;

drop trigger if exists team_entries_notify on team_entries;
create trigger team_entries_notify
  after insert on team_entries
  for each row execute procedure notify_team_entry();

-- Changing open roles ---------------------------------------------------------------------------------------
-- Until now teams couldn't be edited at all. Owners may change the roles and their notes, nothing else; the
-- checks from teams.sql (1 to 10 roles) and open-to-team.sql (notes only for listed roles) still apply.

drop policy if exists "Owners change their team's roles" on teams;
create policy "Owners change their team's roles"
  on teams for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

revoke update on teams from anon, authenticated;
grant update (roles, role_notes) on teams to authenticated;

-- Featured events -------------------------------------------------------------------------------------------

alter table opportunities add column if not exists featured boolean not null default false;

-- As in opportunities.sql, plus: only an admin adds one already featured
drop policy if exists "Users add opportunities as themselves" on opportunities;
create policy "Users add opportunities as themselves"
  on opportunities for insert to authenticated
  with check (submitted_by = auth.uid() and status = 'live' and (not featured or is_admin()));

-- Recording what a team built -------------------------------------------------------------------------------
-- Replaces the function from shared-projects.sql: one of the team's events has ended (its end, else its start,
-- else its deadline, is before today; an event with no dates counts as ended), or the team has no events.

create or replace function team_project_open(team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from teams where id = team)
    and (
      not exists (select 1 from team_entries where team_id = team)
      or exists (
        select 1 from team_entries e join opportunities o on o.id = e.opportunity_id
        where e.team_id = team and coalesce(o.ends_at, o.starts_at, o.deadline, current_date - 1) < current_date
      )
    );
$$;
