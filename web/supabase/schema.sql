-- Schub schema (web MVP). Run once in Supabase Dashboard → SQL Editor on a fresh project.

-- Profiles ------------------------------------------------------------------

create table profiles (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  name                text        not null default '',
  university          text        not null default '',
  graduation_year     integer     not null default 0,
  bio                 text        not null default '',
  skills              text[]      not null default '{}',
  interests           text[]      not null default '{}',
  looking_for         text[]      not null default '{}',
  open_to_collaborate boolean     not null default true,
  avatar_url          text        not null default '',
  updated_at          timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Signed-in users can read profiles"
  on profiles for select to authenticated using (true);

create policy "Users can update their own profile"
  on profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Every new user gets an empty profile, named from sign-up metadata
create function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

create function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure touch_updated_at();

-- Posts ---------------------------------------------------------------------

create table posts (
  id         uuid        primary key default gen_random_uuid(),
  author_id  uuid        not null references profiles(id) on delete cascade,
  content    text        not null check (length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table posts enable row level security;

create policy "Signed-in users can read posts"
  on posts for select to authenticated using (true);

create policy "Users can create their own posts"
  on posts for insert to authenticated with check (auth.uid() = author_id);

create policy "Authors can delete their own posts"
  on posts for delete to authenticated using (auth.uid() = author_id);

-- Ideas ---------------------------------------------------------------------

create type idea_stage as enum ('idea', 'building', 'launched');

create table ideas (
  id            uuid        primary key default gen_random_uuid(),
  author_id     uuid        not null references profiles(id) on delete cascade,
  title         text        not null check (length(title) between 1 and 200),
  description   text        not null default '',
  skills_needed text[]      not null default '{}',
  stage         idea_stage  not null default 'idea',
  created_at    timestamptz not null default now()
);

alter table ideas enable row level security;

create policy "Signed-in users can read ideas"
  on ideas for select to authenticated using (true);

create policy "Users can create their own ideas"
  on ideas for insert to authenticated with check (auth.uid() = author_id);

create policy "Authors can delete their own ideas"
  on ideas for delete to authenticated using (auth.uid() = author_id);

-- Connections ---------------------------------------------------------------

create type connection_status as enum ('pending', 'accepted', 'declined');

create table connections (
  id          uuid              primary key default gen_random_uuid(),
  sender_id   uuid              not null references profiles(id) on delete cascade,
  receiver_id uuid              not null references profiles(id) on delete cascade,
  status      connection_status not null default 'pending',
  created_at  timestamptz       not null default now(),
  constraint no_self_connect check (sender_id != receiver_id),
  constraint unique_pair     unique (sender_id, receiver_id)
);

alter table connections enable row level security;

create policy "Users can see their own connections"
  on connections for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send requests as themselves"
  on connections for insert to authenticated
  with check (auth.uid() = sender_id and status = 'pending');

create policy "Receivers can accept or decline"
  on connections for update to authenticated
  using (auth.uid() = receiver_id) with check (auth.uid() = receiver_id);
