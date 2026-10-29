-- Opportunities + "looking for a team". Run once in Supabase Dashboard → SQL Editor, after schema.sql.
-- Anyone can add an opportunity; it goes live after automatic checks, and 3 reports hide it for review.

create extension if not exists pg_trgm with schema extensions;

-- Admins ----------------------------------------------------------------------
-- No policies: rows can only be added from the dashboard, never through the API.

create table admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table admins enable row level security;

create function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- Opportunities ---------------------------------------------------------------

create type opportunity_type as enum ('hackathon', 'competition', 'grant', 'internship', 'other');
create type opportunity_status as enum ('live', 'hidden', 'removed');

create table opportunities (
  id           uuid               primary key default gen_random_uuid(),
  title        text               not null check (length(title) between 3 and 200),
  type         opportunity_type   not null default 'hackathon',
  organizer    text               not null default '',
  location     text               not null default '',
  url          text               not null check (url ~ '^https?://[^/]+\.[^/]+'),
  -- Same page with or without http(s), www, query string, fragment or trailing slash counts as a duplicate
  url_key      text               generated always as (
    lower(regexp_replace(regexp_replace(url, '^https?://(www\.)?', ''), '/*([?#].*)?$', ''))
  ) stored unique,
  starts_at    date,
  deadline     date,
  description  text               not null default '' check (length(description) <= 3000),
  status       opportunity_status not null default 'live',
  submitted_by uuid               not null default auth.uid() references profiles(id) on delete cascade,
  created_at   timestamptz        not null default now(),
  constraint deadline_before_start check (deadline is null or starts_at is null or deadline <= starts_at)
);

alter table opportunities enable row level security;

create policy "Live opportunities are visible; submitters see their own; admins see all"
  on opportunities for select to authenticated
  using (status = 'live' or submitted_by = auth.uid() or is_admin());

create policy "Users add opportunities as themselves"
  on opportunities for insert to authenticated
  with check (submitted_by = auth.uid() and status = 'live');

create policy "Admins can hide, restore or remove"
  on opportunities for update to authenticated
  using (is_admin()) with check (is_admin());

create policy "Submitters and admins can delete"
  on opportunities for delete to authenticated
  using (submitted_by = auth.uid() or is_admin());

-- Automatic checks on every new opportunity
create function check_new_opportunity()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  if not is_admin() and (
    select count(*) from opportunities
    where submitted_by = new.submitted_by and created_at > now() - interval '1 day'
  ) >= 5 then
    raise exception 'You can add up to 5 opportunities a day. Try again tomorrow.';
  end if;

  if coalesce(new.deadline, new.starts_at) < current_date then
    raise exception 'The dates are in the past.';
  end if;

  if exists (
    select 1 from opportunities
    where status <> 'removed'
      and similarity(lower(title), lower(new.title)) > 0.6
      and (starts_at is not distinct from new.starts_at or deadline is not distinct from new.deadline)
  ) then
    raise exception 'A very similar opportunity is already listed.';
  end if;

  return new;
end;
$$;

create trigger opportunities_check
  before insert on opportunities
  for each row execute procedure check_new_opportunity();

-- Reports ---------------------------------------------------------------------

create type report_reason as enum ('fake', 'duplicate', 'expired', 'other');

create table opportunity_reports (
  opportunity_id uuid          not null references opportunities(id) on delete cascade,
  user_id        uuid          not null references profiles(id) on delete cascade,
  reason         report_reason not null,
  created_at     timestamptz   not null default now(),
  primary key (opportunity_id, user_id)
);

alter table opportunity_reports enable row level security;

create policy "Users see their own reports; admins see all"
  on opportunity_reports for select to authenticated
  using (auth.uid() = user_id or is_admin());

create policy "Users report as themselves"
  on opportunity_reports for insert to authenticated
  with check (auth.uid() = user_id);

-- 3 reports hide a live opportunity until an admin restores or removes it
create function hide_reported_opportunity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from opportunity_reports where opportunity_id = new.opportunity_id) >= 3 then
    update opportunities set status = 'hidden' where id = new.opportunity_id and status = 'live';
  end if;
  return new;
end;
$$;

create trigger opportunity_reports_hide
  after insert on opportunity_reports
  for each row execute procedure hide_reported_opportunity();

-- Looking for a team ------------------------------------------------------------

create table opportunity_participants (
  opportunity_id uuid        not null references opportunities(id) on delete cascade,
  user_id        uuid        not null references profiles(id) on delete cascade,
  note           text        not null default '' check (length(note) <= 300),
  created_at     timestamptz not null default now(),
  primary key (opportunity_id, user_id)
);

alter table opportunity_participants enable row level security;

create policy "Signed-in users can see who is looking"
  on opportunity_participants for select to authenticated using (true);

create policy "Users add themselves"
  on opportunity_participants for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users remove themselves"
  on opportunity_participants for delete to authenticated
  using (auth.uid() = user_id);
