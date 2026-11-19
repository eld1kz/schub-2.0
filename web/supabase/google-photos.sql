-- Members without an uploaded photo show the one from their Google account. Run once in Supabase Dashboard →
-- SQL Editor, after team-contact.sql. Safe to run twice.
-- The Google photo goes into profiles.avatar_url when that's empty, or when it already holds an older Google
-- photo. An uploaded photo (a URL in the media bucket) is never replaced. Only lh3.googleusercontent.com
-- addresses are taken, which is also the only outside host the app shows (see photoUrl in lib/portfolio.ts).

-- The Google photo in an account's metadata, or '' when there's none
create or replace function google_photo(meta jsonb)
returns text language sql immutable set search_path = public as $$
  select coalesce((
    select u from (values (meta->>'avatar_url'), (meta->>'picture')) as v(u)
    where u like 'https://lh3.googleusercontent.com/%' and length(u) <= 500
    limit 1
  ), '');
$$;
-- Only the triggers below use it; it's not part of the API
revoke execute on function google_photo(jsonb) from public, anon, authenticated;

-- New accounts: as length-limits.sql, plus the Google photo
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, avatar_url)
  values (
    new.id,
    case when new.is_anonymous then '' else left(coalesce(new.raw_user_meta_data->>'name', ''), 80) end,
    case when new.is_anonymous then '' else google_photo(new.raw_user_meta_data) end
  );
  return new;
end;
$$;

-- Signing in with Google later (a linked account, or a new Google photo) updates the metadata;
-- the profile follows unless it has an uploaded photo
create or replace function sync_google_photo()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  photo text := google_photo(new.raw_user_meta_data);
begin
  if photo <> '' then
    update profiles set avatar_url = photo
    where id = new.id and avatar_url <> photo and (avatar_url = '' or avatar_url like 'https://lh3.googleusercontent.com/%');
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_metadata_changed on auth.users;
create trigger on_auth_user_metadata_changed
  after update of raw_user_meta_data on auth.users
  for each row when (old.raw_user_meta_data is distinct from new.raw_user_meta_data)
  execute procedure sync_google_photo();

-- Existing members who never uploaded a photo
update profiles p set avatar_url = google_photo(u.raw_user_meta_data)
from auth.users u
where u.id = p.id and p.avatar_url = '' and google_photo(u.raw_user_meta_data) <> '';
