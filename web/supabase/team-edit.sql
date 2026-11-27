-- Editing a team. Run once in Supabase Dashboard → SQL Editor, after opportunity-engine.sql, and BEFORE
-- deploying the app version that uses it. Safe to run twice.
--
-- Owners edit title, description, open roles and notes, languages and work mode. Removing a role declines its
-- pending applications and invites, and tells those people.

-- Replaces "Owners change their team's roles" from team-entries.sql, which only allowed roles and role_notes
drop policy if exists "Owners change their team's roles" on teams;
drop policy if exists "Owners edit their team" on teams;
create policy "Owners edit their team"
  on teams for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

revoke update on teams from anon, authenticated;
grant update (title, description, roles, role_notes, languages, work_mode) on teams to authenticated;

-- Every type so far (team-entries.sql; admin.sql adds none), plus team_role_removed
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in (
  'team_application', 'application_accepted', 'application_declined', 'connection_request', 'connection_accepted',
  'award_tag', 'award_changed', 'team_owner_changed', 'team_invite', 'invite_accepted', 'invite_declined',
  'shared_project', 'shared_project_changed', 'team_entered', 'team_role_removed'
));

create or replace function decline_removed_roles()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  a record;
begin
  for a in
    update team_applications set status = 'declined'
    where team_id = new.id and status = 'pending' and not (role = any (new.roles))
    returning user_id, role, direction
  loop
    perform notify(a.user_id, new.owner_id, 'team_role_removed',
      format('%s no longer needs a %s, so your %s was declined', new.title, a.role,
             case a.direction when 'invite' then 'invitation' else 'application' end),
      '/teams/' || new.id);
  end loop;
  return new;
end;
$$;

drop trigger if exists teams_decline_removed_roles on teams;
create trigger teams_decline_removed_roles
  after update of roles on teams
  for each row execute procedure decline_removed_roles();

-- As in team-invites.sql, plus the first check: a decline made by the trigger above has its own notification
-- (otherwise the owner would be told the invited person declined)
create or replace function notify_team_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  team teams%rowtype;
begin
  if tg_op = 'UPDATE' and new.status = 'declined' and pg_trigger_depth() > 1 then
    return new;
  end if;
  select * into team from teams where id = new.team_id;
  if new.direction = 'invite' then
    if tg_op = 'INSERT' then
      perform notify(new.user_id, team.owner_id, 'team_invite',
                     format('%s invited you to join %s as %s', display_name(team.owner_id), team.title, new.role),
                     '/teams/mine');
    elsif new.status is distinct from old.status and new.status in ('accepted', 'declined') then
      perform notify(team.owner_id, new.user_id, 'invite_' || new.status::text,
                     format('%s %s your invitation to %s', display_name(new.user_id), new.status, team.title),
                     '/teams/' || team.id);
    end if;
  elsif tg_op = 'INSERT' then
    perform notify(team.owner_id, new.user_id, 'team_application',
                   format('%s applied for %s on %s', display_name(new.user_id), new.role, team.title),
                   '/teams/' || team.id);
  elsif new.status is distinct from old.status and new.status in ('accepted', 'declined') then
    perform notify(new.user_id, team.owner_id, 'application_' || new.status::text,
                   format('Your application to %s was %s', team.title, new.status),
                   '/teams/' || team.id);
  end if;
  return new;
end;
$$;
