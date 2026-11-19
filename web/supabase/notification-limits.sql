-- Notification spam limits. Run once in Supabase Dashboard → SQL Editor, after people-discover.sql.
-- Safe to run twice.
--
-- 1. No repeat notification from the same sender to the same person of the same type within 24 hours.
--    Before this, withdrawing and re-sending a connection request, untagging and re-tagging someone on an
--    award, or withdrawing and re-applying to a team notified again every time.
--    Notifications now record who caused them (actor_id), and every trigger goes through notify().
-- 2. A daily cap per sender: 20 connection requests, 10 team applications and 20 award tags.
-- 3. Award tags only for your accepted connections and teammates (people on a team with you, as its
--    owner or an accepted member). Existing tags stay as they are.

-- Who caused each notification -----------------------------------------------------------------------

alter table notifications add column if not exists actor_id uuid references profiles(id) on delete cascade;

create index if not exists notifications_recent_from on notifications (user_id, actor_id, type, created_at desc);

-- Writes a notification unless the same actor sent this person one of this type in the last 24 hours.
-- Only the triggers below call it; nobody can call it through the API.
create or replace function notify(recipient uuid, actor uuid, kind text, message text, link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from notifications
    where user_id = recipient and actor_id = actor and type = kind and created_at > now() - interval '1 day'
  ) then
    return;
  end if;
  insert into notifications (user_id, actor_id, type, message, link) values (recipient, actor, kind, message, link);
end;
$$;

revoke execute on function notify(uuid, uuid, text, text, text) from public, anon, authenticated;

-- The notification triggers, as before (notifications.sql, people-requests.sql, awards.sql) but through notify()

create or replace function notify_team_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  team teams%rowtype;
begin
  select * into team from teams where id = new.team_id;
  if tg_op = 'INSERT' then
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

create or replace function notify_connection()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform notify(new.receiver_id, new.sender_id, 'connection_request',
                   format('%s wants to connect', display_name(new.sender_id)), '/people/requests');
  elsif new.status = 'accepted' and old.status is distinct from 'accepted' then
    perform notify(new.sender_id, new.receiver_id, 'connection_accepted',
                   format('%s accepted your connection', display_name(new.receiver_id)), '/u/' || new.receiver_id);
  end if;
  return new;
end;
$$;

create or replace function notify_award_tag()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  award awards%rowtype;
begin
  select * into award from awards where id = new.award_id;
  perform notify(new.user_id, award.user_id, 'award_tag',
                 format('%s tagged you in %s, %s', display_name(award.user_id), placement_label(award.placement), award.event_name),
                 '/u/' || new.user_id);
  return new;
end;
$$;

create or replace function reset_award_confirmations()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  event_changed boolean := new.event_name is distinct from old.event_name
    or (new.opportunity_id is not null and new.opportunity_id is distinct from old.opportunity_id);
  changes text;
  reset_ids uuid[];
  teammate uuid;
begin
  if new.placement is not distinct from old.placement
     and new.prize_name is not distinct from old.prize_name
     and new.awarded_on is not distinct from old.awarded_on
     and not event_changed then
    return new;
  end if;

  changes := concat_ws(', ',
    case when new.placement is distinct from old.placement then placement_label(new.placement) end,
    case when new.prize_name is distinct from old.prize_name then nullif(new.prize_name, '') end,
    case when event_changed then new.event_name end,
    case when new.awarded_on is distinct from old.awarded_on then to_char(new.awarded_on, 'Mon YYYY') end);
  if changes = '' then
    changes := placement_label(new.placement) || ', ' || new.event_name;
  end if;

  -- Everyone who confirmed goes back to pending, whether or not they're notified again today
  with reset as (
    update award_teammates set status = 'pending'
    where award_id = new.id and status = 'confirmed'
    returning user_id
  )
  select array_agg(user_id) into reset_ids from reset;

  foreach teammate in array coalesce(reset_ids, '{}') loop
    perform notify(teammate, new.user_id, 'award_changed',
                   format('%s changed ''%s, %s'' to ''%s''. Confirm again?',
                          display_name(new.user_id), placement_label(old.placement), old.event_name, changes),
                   '/u/' || teammate);
  end loop;
  return new;
end;
$$;

-- Daily caps ----------------------------------------------------------------------------------------------

create or replace function check_daily_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  sent integer;
begin
  if tg_table_name = 'connections' then
    select count(*) into sent from connections
    where sender_id = new.sender_id and created_at > now() - interval '1 day';
    if sent >= 20 then
      raise exception 'You can send up to 20 connection requests a day. Try again tomorrow.';
    end if;
  elsif tg_table_name = 'team_applications' then
    select count(*) into sent from team_applications
    where user_id = new.user_id and created_at > now() - interval '1 day';
    if sent >= 10 then
      raise exception 'You can apply to up to 10 teams a day. Try again tomorrow.';
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

drop trigger if exists connections_daily_cap on connections;
create trigger connections_daily_cap before insert on connections
  for each row execute procedure check_daily_cap();

drop trigger if exists team_applications_daily_cap on team_applications;
create trigger team_applications_daily_cap before insert on team_applications
  for each row execute procedure check_daily_cap();

drop trigger if exists award_teammates_daily_cap on award_teammates;
create trigger award_teammates_daily_cap before insert on award_teammates
  for each row execute procedure check_daily_cap();

-- Who you can tag ---------------------------------------------------------------------------------------

create or replace function is_connected(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from connections
    where status = 'accepted' and ((sender_id = a and receiver_id = b) or (sender_id = b and receiver_id = a))
  );
$$;

-- On a team together: each is its owner or an accepted member
create or replace function are_teammates(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with members as (
    select id as team_id, owner_id as user_id from teams
    union
    select team_id, user_id from team_applications where status = 'accepted'
  )
  select exists (
    select 1 from members m1 join members m2 on m1.team_id = m2.team_id
    where m1.user_id = a and m2.user_id = b
  );
$$;

-- The people you can tag, for the teammate search in the award form
create or replace function tag_candidates()
returns table (id uuid) language sql stable security definer set search_path = public as $$
  with members as (
    select id as team_id, owner_id as user_id from teams
    union
    select team_id, user_id from team_applications where status = 'accepted'
  )
  select case when sender_id = auth.uid() then receiver_id else sender_id end
  from connections
  where status = 'accepted' and (sender_id = auth.uid() or receiver_id = auth.uid())
  union
  select m2.user_id
  from members m1 join members m2 on m1.team_id = m2.team_id
  where m1.user_id = auth.uid() and m2.user_id <> auth.uid();
$$;

revoke execute on function is_connected(uuid, uuid) from public, anon;
revoke execute on function are_teammates(uuid, uuid) from public, anon;
revoke execute on function tag_candidates() from public, anon;
grant execute on function is_connected(uuid, uuid) to authenticated;
grant execute on function are_teammates(uuid, uuid) to authenticated;
grant execute on function tag_candidates() to authenticated;

-- Same as in awards.sql, plus: only your connections and teammates
drop policy if exists "Owners tag teammates on their own awards" on award_teammates;
drop policy if exists "Owners tag connections and teammates on their own awards" on award_teammates;
create policy "Owners tag connections and teammates on their own awards"
  on award_teammates for insert to authenticated
  with check (
    status = 'pending'
    and user_id <> auth.uid()
    and exists (select 1 from awards w where w.id = award_id and w.user_id = auth.uid())
    and (is_connected(auth.uid(), user_id) or are_teammates(auth.uid(), user_id))
  );
