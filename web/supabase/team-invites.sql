-- Team invites. Run once in Supabase Dashboard → SQL Editor, after languages.sql, and BEFORE deploying the app
-- version that uses it (its pages select the new column). Safe to run twice.
--
-- A team owner can invite someone to one of the team's roles; the invited person accepts or declines. An invite is
-- a row in team_applications with direction = 'invite' (applications are direction = 'application'), so an
-- accepted invite is a member exactly like an accepted application: open roles, member lists, contact details
-- (contact_for), award tags and teammates all keep working without changes. The one-row-per-person-per-team rule
-- also means nobody is invited twice, or invited after applying.
--
-- Who can be invited: someone open to a team (open_to_collaborate) or one of the owner's accepted connections.
-- The owner can withdraw a pending invite. Up to 10 invites a day per owner (withdrawn ones still count), and the
-- 24-hour notification dedupe from notification-limits.sql applies, so withdrawing and inviting again doesn't
-- notify twice.

alter table team_applications add column if not exists direction text not null default 'application';

alter table team_applications drop constraint if exists team_applications_direction_check;
alter table team_applications add constraint team_applications_direction_check check (direction in ('application', 'invite'));

-- Whether someone other than `except_id` has been accepted for `role` on the team. Runs as its owner, so the
-- policies below see every row, not only the ones the caller can read.
create or replace function role_filled(team uuid, filled_role text, except_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from team_applications
    where team_id = team and role = filled_role and status = 'accepted' and id is distinct from except_id
  );
$$;

revoke execute on function role_filled(uuid, text, uuid) from public, anon;
grant execute on function role_filled(uuid, text, uuid) to authenticated;

-- Inserting ------------------------------------------------------------------------------------------------

-- As in teams.sql, plus: applications only
drop policy if exists "Users apply as themselves, to a listed role on someone else's team" on team_applications;
create policy "Users apply as themselves, to a listed role on someone else's team"
  on team_applications for insert to authenticated
  with check (
    direction = 'application'
    and user_id = auth.uid()
    and status = 'pending'
    and exists (select 1 from teams t where t.id = team_id and t.owner_id <> auth.uid() and role = any (t.roles))
  );

-- Owners invite someone else to one of their team's open roles (nobody accepted for it yet): a person open to a
-- team, or one of their connections
drop policy if exists "Owners invite people open to a team or their connections" on team_applications;
create policy "Owners invite people open to a team or their connections"
  on team_applications for insert to authenticated
  with check (
    direction = 'invite'
    and status = 'pending'
    and user_id <> auth.uid()
    and exists (select 1 from teams t where t.id = team_id and t.owner_id = auth.uid() and role = any (t.roles))
    and not role_filled(team_id, role, null)
    and (
      exists (select 1 from profiles p where p.id = user_id and p.open_to_collaborate and p.name <> '')
      or is_connected(auth.uid(), user_id)
    )
  );

-- Answering ------------------------------------------------------------------------------------------------

-- Replaces "Owners accept or decline" from teams.sql: owners answer applications only, never invites
drop policy if exists "Owners accept or decline" on team_applications;
drop policy if exists "Owners accept or decline applications" on team_applications;
create policy "Owners accept or decline applications"
  on team_applications for update to authenticated
  using (direction = 'application' and exists (select 1 from teams t where t.id = team_id and t.owner_id = auth.uid()))
  with check (direction = 'application' and exists (select 1 from teams t where t.id = team_id and t.owner_id = auth.uid()));

-- The invited person accepts or declines while the invite is pending. Accepting needs the role still open:
-- someone may have been accepted for it since the invite was sent.
drop policy if exists "Invited people accept or decline" on team_applications;
create policy "Invited people accept or decline"
  on team_applications for update to authenticated
  using (direction = 'invite' and user_id = auth.uid() and status = 'pending')
  with check (
    direction = 'invite' and user_id = auth.uid()
    and (status = 'declined' or (status = 'accepted' and not role_filled(team_id, role, id)))
  );

-- Only status is updatable (teams.sql), so nobody can turn an invite into an application or move it

-- Withdrawing ----------------------------------------------------------------------------------------------
-- "Applicants can withdraw" (teams.sql) still lets anyone delete their own row: leave a team, or dismiss an invite.

drop policy if exists "Owners withdraw pending invites" on team_applications;
create policy "Owners withdraw pending invites"
  on team_applications for delete to authenticated
  using (direction = 'invite' and status = 'pending' and exists (select 1 from teams t where t.id = team_id and t.owner_id = auth.uid()));

-- Notifications --------------------------------------------------------------------------------------------
-- Every type so far (team_owner_changed is from delete-account.sql), plus the invite ones

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in (
  'team_application', 'application_accepted', 'application_declined', 'connection_request', 'connection_accepted',
  'award_tag', 'award_changed', 'team_owner_changed', 'team_invite', 'invite_accepted', 'invite_declined'
));

-- As in notification-limits.sql, plus invites: the invited person hears about the invite (it waits in Your teams),
-- and the owner hears the answer
create or replace function notify_team_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  team teams%rowtype;
begin
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

-- Daily caps -----------------------------------------------------------------------------------------------
-- As in notification-limits.sql, except team_applications: applications count against the applicant (10 a day,
-- invites they received don't count), and invites against the team's owner (10 a day across their teams).

create or replace function check_daily_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  sent integer;
  inviter uuid;
begin
  if tg_table_name = 'connections' then
    select count(*) into sent from connections
    where sender_id = new.sender_id and created_at > now() - interval '1 day';
    if sent >= 20 then
      raise exception 'You can send up to 20 connection requests a day. Try again tomorrow.';
    end if;
  elsif tg_table_name = 'team_applications' then
    -- Nested: other tables' rows have no direction column
    if new.direction = 'invite' then
      -- Withdrawn invites are deleted, so also count the people this owner already sent an invitation
      -- notification today (one per person a day, notify() in notification-limits.sql). Without this, inviting,
      -- withdrawing and inviting someone new would never reach the cap.
      select owner_id into inviter from teams where id = new.team_id;
      select greatest(
        (select count(*) from team_applications a join teams t on t.id = a.team_id
         where a.direction = 'invite' and t.owner_id = inviter and a.created_at > now() - interval '1 day'),
        (select count(*) from notifications
         where actor_id = inviter and type = 'team_invite' and created_at > now() - interval '1 day')
      ) into sent;
      if sent >= 10 then
        raise exception 'You can send up to 10 invitations a day. Try again tomorrow.';
      end if;
    else
      select count(*) into sent from team_applications
      where user_id = new.user_id and direction = 'application' and created_at > now() - interval '1 day';
      if sent >= 10 then
        raise exception 'You can apply to up to 10 teams a day. Try again tomorrow.';
      end if;
    end if;
  elsif tg_table_name = 'award_teammates' then
    select count(*) into sent from award_teammates t join awards w on w.id = t.award_id
    where w.user_id = (select user_id from awards where id = new.award_id) and t.created_at > now() - interval '1 day';
    if sent >= 20 then
      raise exception 'You can tag up to 20 people a day. Try again tomorrow.';
    end if;
  end if;
  return new;
end;
$$;
