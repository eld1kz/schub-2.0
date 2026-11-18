-- Make your Google account an admin. Run in Supabase Dashboard → SQL Editor, after opportunities.sql
-- and after you've signed in with that account once. Safe to run twice.
-- Before running: replace YOUR_GOOGLE_EMAIL below with your Google email, in the SQL Editor only.
-- Don't commit the real address.

do $$
declare
  admin_email text := lower(trim('YOUR_GOOGLE_EMAIL'));
begin
  if admin_email not like '%@%' then
    raise exception 'Replace YOUR_GOOGLE_EMAIL with your Google email before running.';
  end if;

  if not exists (select 1 from auth.users where lower(email) = admin_email) then
    raise exception 'No user with email %. Sign in with that Google account first.', admin_email;
  end if;

  insert into admins (user_id)
  select id from auth.users where lower(email) = admin_email
  on conflict (user_id) do nothing;
end $$;
