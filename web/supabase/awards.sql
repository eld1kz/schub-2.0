-- Awards: hackathon and competition results on profiles, optionally linked to a Schub opportunity,
-- one of the owner's projects and a Schub team, with teammates who confirm they were there.
-- Run once in Supabase Dashboard → SQL Editor, after opportunity-details.sql.

-- Awards ---------------------------------------------------------------------------

create table awards (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null default auth.uid() references profiles(id) on delete cascade,
  placement      text        not null check (placement in (
    'Winner', '1st', '2nd', '3rd', 'Finalist', 'Track winner', 'Special prize', 'Honorable mention'
  )),
  prize_name     text        not null default '' check (length(prize_name) <= 100),
  -- A Schub opportunity, when the event is listed. event_name always holds the event's name
  -- (the opportunity's title when linked), so it still reads right if the opportunity is deleted.
  opportunity_id uuid        references opportunities(id) on delete set null,
  event_name     text        not null check (length(trim(event_name)) between 1 and 200),
  -- First day of the month
  awarded_on     date        not null check (extract(day from awarded_on) = 1),
  project_id     uuid        references projects(id) on delete set null,
  team_id        uuid        references teams(id) on delete set null,
  proof_url      text        not null default '' check (proof_url = '' or proof_url ~ '^https?://'),
  description    text        not null default '' check (length(description) <= 300),
  created_at     timestamptz not null default now()
);

create index awards_user on awards (user_id);
create index awards_opportunity on awards (opportunity_id) where opportunity_id is not null;

alter table awards enable row level security;

create policy "Signed-in users can read awards"
  on awards for select to authenticated using (true);

-- The project has to be one of yours, and the team one you started or were accepted to
create policy "Users add their own awards"
  on awards for insert to authenticated
  with check (
    user_id = auth.uid()
    and (project_id is null or exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid()))
    and (team_id is null or exists (
      select 1 from teams t where t.id = team_id and (
        t.owner_id = auth.uid()
        or exists (select 1 from team_applications a where a.team_id = t.id and a.user_id = auth.uid() and a.status = 'accepted')
      )
    ))
  );

create policy "Users edit their own awards"
  on awards for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (project_id is null or exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid()))
    and (team_id is null or exists (
      select 1 from teams t where t.id = team_id and (
        t.owner_id = auth.uid()
        or exists (select 1 from team_applications a where a.team_id = t.id and a.user_id = auth.uid() and a.status = 'accepted')
      )
    ))
  );

create policy "Users delete their own awards"
  on awards for delete to authenticated using (user_id = auth.uid());

-- Teammates ------------------------------------------------------------------------

create table award_teammates (
  award_id   uuid        not null references awards(id) on delete cascade,
  user_id    uuid        not null references profiles(id) on delete cascade,
  status     text        not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  created_at timestamptz not null default now(),
  primary key (award_id, user_id)
);

create index award_teammates_user on award_teammates (user_id, status);

alter table award_teammates enable row level security;

-- Confirmed teammates are public; pending and declined ones only to the tagged person and the award's owner
create policy "Confirmed teammates are visible; the tagged person and the owner see the rest"
  on award_teammates for select to authenticated
  using (
    status = 'confirmed'
    or user_id = auth.uid()
    or exists (select 1 from awards w where w.id = award_id and w.user_id = auth.uid())
  );

-- Only the owner tags people, never themselves, and every tag starts out pending
create policy "Owners tag teammates on their own awards"
  on award_teammates for insert to authenticated
  with check (
    status = 'pending'
    and user_id <> auth.uid()
    and exists (select 1 from awards w where w.id = award_id and w.user_id = auth.uid())
  );

-- The owner can untag someone, except a person who declined: their row stays so they can't be tagged again
create policy "Owners untag teammates who haven't declined"
  on award_teammates for delete to authenticated
  using (
    status <> 'declined'
    and exists (select 1 from awards w where w.id = award_id and w.user_id = auth.uid())
  );

-- The tagged person confirms or declines. Removing yourself later is declining.
create policy "Tagged users answer for themselves"
  on award_teammates for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and status in ('confirmed', 'declined'));

revoke update on award_teammates from anon, authenticated;
grant update (status) on award_teammates to authenticated;

-- Guests can't write (same restrictive policies as in auth.sql) --------------------

do $$
declare
  t text;
begin
  foreach t in array array['awards', 'award_teammates'] loop
    execute format('create policy "Guests can''t add" on %I as restrictive for insert to authenticated with check (not is_guest())', t);
    execute format('create policy "Guests can''t edit" on %I as restrictive for update to authenticated using (not is_guest())', t);
    execute format('create policy "Guests can''t delete" on %I as restrictive for delete to authenticated using (not is_guest())', t);
  end loop;
end;
$$;

-- Notifications --------------------------------------------------------------------
-- Being tagged: "Hana tagged you in 1st place, Imagine Cup 2027". It opens your own profile,
-- where the tag waits at the top with Confirm and Decline.

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in (
  'team_application', 'application_accepted', 'application_declined', 'connection_request', 'connection_accepted',
  'award_tag'
));

create function notify_award_tag()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  award awards%rowtype;
begin
  select * into award from awards where id = new.award_id;
  insert into notifications (user_id, type, message, link)
  values (new.user_id, 'award_tag',
          format('%s tagged you in %s, %s', display_name(award.user_id),
                 case when award.placement in ('1st', '2nd', '3rd') then award.placement || ' place' else award.placement end,
                 award.event_name),
          '/u/' || new.user_id);
  return new;
end;
$$;

create trigger award_teammates_notify
  after insert on award_teammates
  for each row execute procedure notify_award_tag();
