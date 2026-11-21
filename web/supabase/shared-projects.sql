-- Shared projects: what a team built, on every member's profile. Run once in Supabase Dashboard → SQL Editor, after
-- team-invites.sql, and BEFORE deploying the app version that uses it. Safe to run twice.
--
-- A team's owner records what the team built (one per team): title, pitch, image, live and code links, and an
-- optional result. For a team tied to an opportunity it opens once the event has ended; for a team with no
-- opportunity (its own project), any time. Every accepted member gets a pending confirmation, the same way as award
-- tags (awards.sql): once they confirm, it shows in the Projects section of their profile with "Built with" and the
-- members' photos. The owner is on it from the start. Anyone on it can hide it from their own profile later.
-- Changing the title or the result sets everyone who confirmed back to pending and asks them again.
--
-- Deleting an account (delete-account.sql): team_project_members rows cascade with the profile, and a project
-- stays with its team when the team is handed over. Its image lives in the owner's Storage folder, which the app
-- empties first, so deleteAccount clears the image of projects on teams the leaving member owns.

-- Projects -------------------------------------------------------------------------------------------------

create table if not exists team_projects (
  id         uuid        primary key default gen_random_uuid(),
  team_id    uuid        not null unique references teams(id) on delete cascade,
  title      text        not null check (length(title) <= 80 and length(trim(title)) >= 1),
  pitch      text        not null default '' check (length(pitch) <= 200),
  image_url  text        not null default '' check (length(image_url) <= 500),
  url        text        not null default '' check (length(url) <= 1000 and (url = '' or url ~ '^https?://')),
  repo_url   text        not null default '' check (length(repo_url) <= 1000 and (repo_url = '' or repo_url ~ '^https?://')),
  result     text        not null default '' check (length(result) <= 60),
  created_at timestamptz not null default now()
);

alter table team_projects enable row level security;

-- When a team may record its project: its event has ended (the end date, else the start, else the deadline, is
-- before today), or it has no event, or the event has no dates to tell. The app asks this too (it can't always
-- read the event: a hidden one comes back empty), so the Record button and this policy agree.
create or replace function team_project_open(team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select o.id is null or coalesce(o.ends_at, o.starts_at, o.deadline, current_date - 1) < current_date
    from teams t left join opportunities o on o.id = t.opportunity_id
    where t.id = team
  ), false);
$$;

revoke execute on function team_project_open(uuid) from public, anon;
grant execute on function team_project_open(uuid) to authenticated;

drop policy if exists "Everyone can read team projects" on team_projects;
create policy "Everyone can read team projects"
  on team_projects for select to anon, authenticated using (true);

drop policy if exists "Owners record their team's project once it's open" on team_projects;
create policy "Owners record their team's project once it's open"
  on team_projects for insert to authenticated
  with check (exists (select 1 from teams t where t.id = team_id and t.owner_id = auth.uid()) and team_project_open(team_id));

drop policy if exists "Owners edit their team's project" on team_projects;
create policy "Owners edit their team's project"
  on team_projects for update to authenticated
  using (exists (select 1 from teams t where t.id = team_id and t.owner_id = auth.uid()))
  with check (exists (select 1 from teams t where t.id = team_id and t.owner_id = auth.uid()));

-- The team can't be swapped for another one
revoke update on team_projects from anon, authenticated;
grant update (title, pitch, image_url, url, repo_url, result) on team_projects to authenticated;

-- Who's on it --------------------------------------------------------------------------------------------------

create table if not exists team_project_members (
  project_id uuid        not null references team_projects(id) on delete cascade,
  user_id    uuid        not null references profiles(id) on delete cascade,
  status     text        not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  -- Hidden from this member's own profile; they're still shown as having built it
  hidden     boolean     not null default false,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists team_project_members_user on team_project_members (user_id, status);

alter table team_project_members enable row level security;

-- Confirmed members are public; pending and declined ones only to themselves and the team's owner
drop policy if exists "Confirmed members are visible; the member and the owner see the rest" on team_project_members;
create policy "Confirmed members are visible; the member and the owner see the rest"
  on team_project_members for select to anon, authenticated
  using (
    status = 'confirmed'
    or user_id = auth.uid()
    or exists (select 1 from team_projects p join teams t on t.id = p.team_id where p.id = project_id and t.owner_id = auth.uid())
  );

-- Rows are only written by the triggers below. Members answer for themselves and hide it from their own profile.
drop policy if exists "Members answer and hide for themselves" on team_project_members;
create policy "Members answer and hide for themselves"
  on team_project_members for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and status in ('confirmed', 'declined'));

revoke insert, update, delete on team_project_members from anon, authenticated;
grant update (status, hidden) on team_project_members to authenticated;

-- Only until another member has confirmed it: after that, deleting (and recording again) would take it off their
-- profiles and ask people who declined all over again. It can still be edited.
drop policy if exists "Owners delete their team's project" on team_projects;
drop policy if exists "Owners delete their team's project until someone else confirms" on team_projects;
create policy "Owners delete their team's project until someone else confirms"
  on team_projects for delete to authenticated
  using (
    exists (select 1 from teams t where t.id = team_id and t.owner_id = auth.uid())
    and not exists (select 1 from team_project_members m where m.project_id = id and m.status = 'confirmed' and m.user_id <> auth.uid())
  );

-- Guests can't write (same restrictive policies as in auth.sql) -----------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['team_projects', 'team_project_members'] loop
    execute format('drop policy if exists "Guests can''t add" on %I', t);
    execute format('drop policy if exists "Guests can''t edit" on %I', t);
    execute format('drop policy if exists "Guests can''t delete" on %I', t);
    execute format('create policy "Guests can''t add" on %I as restrictive for insert to authenticated with check (not is_guest())', t);
    execute format('create policy "Guests can''t edit" on %I as restrictive for update to authenticated using (not is_guest())', t);
    execute format('create policy "Guests can''t delete" on %I as restrictive for delete to authenticated using (not is_guest())', t);
  end loop;
end;
$$;

-- Notifications ------------------------------------------------------------------------------------------------
-- Both open the member's own profile, where the confirmation waits at the top

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in (
  'team_application', 'application_accepted', 'application_declined', 'connection_request', 'connection_accepted',
  'award_tag', 'award_changed', 'team_owner_changed', 'team_invite', 'invite_accepted', 'invite_declined',
  'shared_project', 'shared_project_changed'
));

-- Recording the project: the owner is on it, every accepted member is asked to confirm
create or replace function add_team_project_members()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  team teams%rowtype;
  member uuid;
begin
  select * into team from teams where id = new.team_id;
  insert into team_project_members (project_id, user_id, status) values (new.id, team.owner_id, 'confirmed')
  on conflict do nothing;
  for member in select user_id from team_applications where team_id = new.team_id and status = 'accepted' and user_id <> team.owner_id loop
    insert into team_project_members (project_id, user_id) values (new.id, member) on conflict do nothing;
    perform notify(member, team.owner_id, 'shared_project',
                   format('%s recorded what %s built: %s. Add it to your profile?', display_name(team.owner_id), team.title, new.title),
                   '/u/' || member);
  end loop;
  return new;
end;
$$;

drop trigger if exists team_projects_add_members on team_projects;
create trigger team_projects_add_members
  after insert on team_projects
  for each row execute procedure add_team_project_members();

-- Changing the title or the result: everyone who confirmed, except the owner, confirms again
create or replace function reset_team_project_confirmations()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  owner uuid;
  reset_ids uuid[];
  member uuid;
begin
  if new.title is not distinct from old.title and new.result is not distinct from old.result then
    return new;
  end if;
  select owner_id into owner from teams where id = new.team_id;
  with reset as (
    update team_project_members set status = 'pending'
    where project_id = new.id and status = 'confirmed' and user_id <> owner
    returning user_id
  )
  select array_agg(user_id) into reset_ids from reset;
  foreach member in array coalesce(reset_ids, '{}') loop
    perform notify(member, owner, 'shared_project_changed',
                   format('%s changed ''%s''. Confirm again?', display_name(owner), old.title),
                   '/u/' || member);
  end loop;
  return new;
end;
$$;

drop trigger if exists team_projects_reset_confirmations on team_projects;
create trigger team_projects_reset_confirmations
  after update of title, result on team_projects
  for each row execute procedure reset_team_project_confirmations();

-- Joining later ------------------------------------------------------------------------------------------------
-- Someone accepted after the project was recorded (an application or an invite) is asked to confirm too

create or replace function add_late_team_project_member()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  project team_projects%rowtype;
  team teams%rowtype;
begin
  if new.status <> 'accepted' or (tg_op = 'UPDATE' and old.status = 'accepted') then
    return new;
  end if;
  select * into project from team_projects where team_id = new.team_id;
  if project.id is null then
    return new;
  end if;
  select * into team from teams where id = new.team_id;
  insert into team_project_members (project_id, user_id) values (project.id, new.user_id) on conflict do nothing;
  if found then
    perform notify(new.user_id, team.owner_id, 'shared_project',
                   format('%s recorded what %s built: %s. Add it to your profile?', display_name(team.owner_id), team.title, project.title),
                   '/u/' || new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists team_applications_add_to_project on team_applications;
create trigger team_applications_add_to_project
  after insert or update of status on team_applications
  for each row execute procedure add_late_team_project_member();
