-- Notifications. Run once in Supabase Dashboard → SQL Editor, after auth.sql.
-- Rows are written only by the triggers below, which build the message from real data,
-- so nobody can put a notification in someone else's list through the API.

create table notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  type       text        not null check (type in (
    'team_application', 'application_accepted', 'application_declined', 'connection_request', 'connection_accepted'
  )),
  message    text        not null,
  -- Always a page on this site
  link       text        not null check (link ~ '^/[a-z]'),
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_recent on notifications (user_id, created_at desc);

alter table notifications enable row level security;

create policy "Users see their own notifications"
  on notifications for select to authenticated using (user_id = auth.uid());

create policy "Users mark their own notifications read"
  on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Only the read flag can change; there is no insert or delete policy
revoke update on notifications from anon, authenticated;
grant update (read) on notifications to authenticated;

create function display_name(profile_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(name, ''), 'Someone') from profiles where id = profile_id;
$$;

-- Team applications: the owner hears about new applicants, the applicant hears the answer
create function notify_team_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  team teams%rowtype;
begin
  select * into team from teams where id = new.team_id;
  if tg_op = 'INSERT' then
    insert into notifications (user_id, type, message, link)
    values (team.owner_id, 'team_application',
            format('%s applied for %s on %s', display_name(new.user_id), new.role, team.title),
            '/teams/' || team.id);
  elsif new.status is distinct from old.status and new.status in ('accepted', 'declined') then
    insert into notifications (user_id, type, message, link)
    values (new.user_id, 'application_' || new.status::text,
            format('Your application to %s was %s', team.title, new.status),
            '/teams/' || team.id);
  end if;
  return new;
end;
$$;

create trigger team_applications_notify
  after insert or update of status on team_applications
  for each row execute procedure notify_team_application();

-- Connections: the receiver hears about the request, the sender hears when it's accepted
create function notify_connection()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into notifications (user_id, type, message, link)
    values (new.receiver_id, 'connection_request', format('%s wants to connect', display_name(new.sender_id)), '/people');
  elsif new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into notifications (user_id, type, message, link)
    values (new.sender_id, 'connection_accepted', format('%s accepted your connection', display_name(new.receiver_id)), '/u/' || new.receiver_id);
  end if;
  return new;
end;
$$;

create trigger connections_notify
  after insert or update of status on connections
  for each row execute procedure notify_connection();
