-- Members can delete their own account. Run once in Supabase Dashboard → SQL Editor, after account-photos.sql.
-- Safe to run twice.
--
-- delete_my_account() deletes the caller (auth.uid()) and nobody else. It runs as the function's owner so it can
-- remove the auth.users row, which the app's keys can't. Before that it:
--   - hands each team the member owns to the member accepted earliest (and tells the team), or deletes the team
--     when nobody else is on it
--   - keeps opportunities they submitted listed, with submitted_by set to null
--   - deletes their awards (and the tags on them), their tags on other people's awards, and every notification
--     sent to or by them
-- Deleting the auth.users row then cascades to profiles, and from there to every table that references it.
-- Their photos and project images are removed by the app through the Storage API first: Supabase doesn't
-- allow deleting storage files from SQL.
--
-- Tables that reference a user, and what happens to their rows:
--   profiles.id                           → auth.users  cascade
--   admins.user_id                        → auth.users  cascade (but the last admin can't delete their account)
--   teams.owner_id                        → profiles    handed over or deleted here, first
--   team_applications.user_id             → profiles    cascade (the new owner's own application is removed here)
--   opportunities.submitted_by            → profiles    set null (changed below; was cascade)
--   opportunity_participants.user_id      → profiles    cascade
--   opportunity_reports.user_id           → profiles    cascade
--   connections.sender_id / receiver_id   → profiles    cascade
--   experiences.user_id, projects.user_id → profiles    cascade
--   awards.user_id                        → profiles    deleted here (cascade too); award_teammates go with them
--   award_teammates.user_id               → profiles    deleted here (cascade too)
--   notifications.user_id / actor_id      → profiles    deleted here (cascade too)
--   ideas.author_id, posts.author_id      → profiles    cascade (the on-hold feed)
--   auth.identities, sessions, refresh tokens and the like → auth.users cascade (Supabase's own)

-- Opportunities stay listed after their submitter leaves -----------------------------------------------------
alter table opportunities alter column submitted_by drop not null;
alter table opportunities drop constraint if exists opportunities_submitted_by_fkey;
alter table opportunities add constraint opportunities_submitted_by_fkey
  foreign key (submitted_by) references profiles(id) on delete set null;

-- When each member was accepted, so a team goes to the one accepted earliest ---------------------------------
alter table team_applications add column if not exists accepted_at timestamptz;
-- Older acceptances weren't timed; the application date is the closest there is
update team_applications set accepted_at = created_at where status = 'accepted' and accepted_at is null;

create or replace function stamp_acceptance()
returns trigger language plpgsql as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    new.accepted_at := now();
  elsif new.status <> 'accepted' then
    new.accepted_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists team_applications_accepted_at on team_applications;
create trigger team_applications_accepted_at
  before update of status on team_applications
  for each row execute procedure stamp_acceptance();

-- The team hears who runs it now -----------------------------------------------------------------------------
alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in (
  'team_application', 'application_accepted', 'application_declined', 'connection_request', 'connection_accepted',
  'award_tag', 'award_changed', 'team_owner_changed'
));

-- Why an account can't be deleted right now, or '' when it can ----------------------------------------------
create or replace function account_deletion_blocker(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
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

-- For the settings page, to say so before anyone types DELETE
create or replace function my_account_deletion_blocker()
returns text language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then '' else account_deletion_blocker(auth.uid()) end;
$$;
revoke execute on function my_account_deletion_blocker() from public, anon;
grant execute on function my_account_deletion_blocker() to authenticated;

create or replace function delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  blocker text;
  t record;
  heir record;
  leaving text;
begin
  -- A token outlives its account for a while; it can't be used to delete anything else
  if me is null or is_guest() or not exists (select 1 from auth.users where id = me) then
    raise exception 'Sign in to delete your account.' using errcode = '42501';
  end if;
  blocker := account_deletion_blocker(me);
  if blocker <> '' then
    raise exception '%', blocker using errcode = 'P0001';
  end if;
  leaving := display_name(me);

  -- Teams: to the member accepted earliest, or gone when nobody else is on them
  for t in select id, title, roles from teams where owner_id = me for update loop
    select a.id, a.user_id, a.role into heir
    from team_applications a
    where a.team_id = t.id and a.status = 'accepted' and a.user_id <> me
    order by a.accepted_at nulls last, a.created_at, a.id
    limit 1;

    if not found then
      delete from teams where id = t.id;
    else
      -- The new owner runs the team rather than filling a role on it
      delete from team_applications where id = heir.id;
      update teams set owner_id = heir.user_id, roles = array_remove(roles, heir.role) where id = t.id;
      insert into notifications (user_id, actor_id, type, message, link)
      values (heir.user_id, null, 'team_owner_changed',
              format('%s deleted their account, so you now run %s', leaving, t.title), '/teams/' || t.id);
      insert into notifications (user_id, actor_id, type, message, link)
      select a.user_id, heir.user_id, 'team_owner_changed',
             format('%s deleted their account. %s now runs %s', leaving, display_name(heir.user_id), t.title), '/teams/' || t.id
      from team_applications a
      where a.team_id = t.id and a.status = 'accepted' and a.user_id not in (me, heir.user_id);
    end if;
  end loop;

  update opportunities set submitted_by = null where submitted_by = me;
  delete from awards where user_id = me;
  delete from award_teammates where user_id = me;
  delete from notifications where user_id = me or actor_id = me;

  -- Cascades to profiles and everything that references it
  delete from auth.users where id = me;
end;
$$;
revoke execute on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;
