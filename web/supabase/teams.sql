-- Teams with open roles. Run once in Supabase Dashboard → SQL Editor, after contact.sql.
-- Anyone can post a team and list the roles it needs; people apply to a role; the owner accepts or declines.

-- Teams -------------------------------------------------------------------------

create table teams (
  id             uuid        primary key default gen_random_uuid(),
  owner_id       uuid        not null default auth.uid() references profiles(id) on delete cascade,
  opportunity_id uuid        references opportunities(id) on delete set null,
  title          text        not null check (length(title) between 3 and 120),
  description    text        not null default '' check (length(description) <= 2000),
  roles          text[]      not null check (cardinality(roles) between 1 and 10),
  created_at     timestamptz not null default now()
);

alter table teams enable row level security;

create policy "Signed-in users can read teams"
  on teams for select to authenticated using (true);

create policy "Users post teams as themselves"
  on teams for insert to authenticated with check (owner_id = auth.uid());

create policy "Owners can delete their teams"
  on teams for delete to authenticated using (owner_id = auth.uid());

-- Applications ------------------------------------------------------------------

create type application_status as enum ('pending', 'accepted', 'declined');

create table team_applications (
  id         uuid               primary key default gen_random_uuid(),
  team_id    uuid               not null references teams(id) on delete cascade,
  user_id    uuid               not null references profiles(id) on delete cascade,
  role       text               not null,
  note       text               not null default '' check (length(note) <= 300),
  status     application_status not null default 'pending',
  created_at timestamptz        not null default now(),
  constraint one_application_per_team unique (team_id, user_id)
);

alter table team_applications enable row level security;

-- Accepted members are public; pending and declined ones are between the applicant and the owner
create policy "Members are visible; applicants and owners see the rest"
  on team_applications for select to authenticated
  using (
    status = 'accepted'
    or user_id = auth.uid()
    or exists (select 1 from teams t where t.id = team_id and t.owner_id = auth.uid())
  );

create policy "Users apply as themselves, to a listed role on someone else's team"
  on team_applications for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and exists (select 1 from teams t where t.id = team_id and t.owner_id <> auth.uid() and role = any (t.roles))
  );

create policy "Owners accept or decline"
  on team_applications for update to authenticated
  using (exists (select 1 from teams t where t.id = team_id and t.owner_id = auth.uid()))
  with check (exists (select 1 from teams t where t.id = team_id and t.owner_id = auth.uid()));

create policy "Applicants can withdraw"
  on team_applications for delete to authenticated using (user_id = auth.uid());

-- Owners may only change the status, never who applied or to what
revoke update on team_applications from anon, authenticated;
grant update (status) on team_applications to authenticated;

-- Contact details ----------------------------------------------------------------
-- Replaces the function from contact.sql: a team owner and an accepted member can now
-- see each other's contact details too, same as an accepted connection.

create or replace function contact_for(profile_id uuid)
returns table (telegram text, email text)
language sql stable security definer set search_path = public as $$
  select p.telegram, p.email
  from profiles p
  where p.id = profile_id
    and (
      p.id = auth.uid()
      or exists (
        select 1 from connections c
        where c.status = 'accepted'
          and ((c.sender_id = auth.uid() and c.receiver_id = p.id)
            or (c.sender_id = p.id and c.receiver_id = auth.uid()))
      )
      or exists (
        select 1 from team_applications a join teams t on t.id = a.team_id
        where a.status = 'accepted'
          and ((t.owner_id = auth.uid() and a.user_id = p.id)
            or (t.owner_id = p.id and a.user_id = auth.uid()))
      )
    );
$$;
