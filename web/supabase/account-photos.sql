-- GitHub account photos too, the same way as Google's. Run once in Supabase Dashboard → SQL Editor, after
-- google-photos.sql. Safe to run twice, and complete on its own if google-photos.sql was never run.
-- A member's account photo goes into profiles.avatar_url when that's empty or already holds an account photo;
-- an uploaded photo (a URL in the media bucket) is never replaced. Only Google's and GitHub's image hosts are
-- taken, which are also the only outside hosts the app shows (see photoUrl in lib/portfolio.ts).

-- The account photo in a user's metadata, or '' when there's none
create or replace function account_photo(meta jsonb)
returns text language sql immutable set search_path = public as $$
  select coalesce((
    select u from (values (meta->>'avatar_url'), (meta->>'picture')) as v(u)
    where (u like 'https://lh3.googleusercontent.com/%' or u like 'https://avatars.githubusercontent.com/%')
      and length(u) <= 500
    limit 1
  ), '');
$$;
-- Only the triggers below use it; it's not part of the API
revoke execute on function account_photo(jsonb) from public, anon, authenticated;

-- An account photo already in avatar_url, which a newer one may replace
create or replace function is_account_photo(url text)
returns boolean language sql immutable set search_path = public as $$
  select url like 'https://lh3.googleusercontent.com/%' or url like 'https://avatars.githubusercontent.com/%';
$$;
revoke execute on function is_account_photo(text) from public, anon, authenticated;

-- New accounts: as length-limits.sql, plus the account photo
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, avatar_url)
  values (
    new.id,
    case when new.is_anonymous then '' else left(coalesce(new.raw_user_meta_data->>'name', ''), 80) end,
    case when new.is_anonymous then '' else account_photo(new.raw_user_meta_data) end
  );
  return new;
end;
$$;

-- Signing in again (a linked account, or a new photo) updates the metadata; the profile follows unless it
-- has an uploaded photo
create or replace function sync_account_photo()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  photo text := account_photo(new.raw_user_meta_data);
begin
  if photo <> '' then
    update profiles set avatar_url = photo
    where id = new.id and avatar_url <> photo and (avatar_url = '' or is_account_photo(avatar_url));
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_metadata_changed on auth.users;
create trigger on_auth_user_metadata_changed
  after update of raw_user_meta_data on auth.users
  for each row when (old.raw_user_meta_data is distinct from new.raw_user_meta_data)
  execute procedure sync_account_photo();

-- Replaced by the functions above
drop function if exists sync_google_photo();
drop function if exists google_photo(jsonb);

-- Existing members who never uploaded a photo
update profiles p set avatar_url = account_photo(u.raw_user_meta_data)
from auth.users u
where u.id = p.id and p.avatar_url = '' and account_photo(u.raw_user_meta_data) <> '';
