-- Signed-out visitors browse without an account. Run once in Supabase Dashboard → SQL Editor, after
-- length-limits.sql, and BEFORE deploying the app version that stops creating guest accounts (otherwise
-- signed-out visitors see empty pages until this runs). Safe to run twice.
--
-- Until now every new visitor got an anonymous "guest" account, and everything public was readable
-- "to authenticated". Now visitors without a session use the anon role, so the same read policies
-- also apply to anon. Writes are unchanged: every insert, update and delete policy is still
-- "to authenticated", so anon can't write anything. Private tables (connections, notifications,
-- reports, admins) stay closed to anon.

do $$
declare
  p record;
begin
  for p in select * from (values
    ('profiles',                 'Signed-in users can read profiles',                                 'Everyone can read profiles'),
    ('posts',                    'Signed-in users can read posts',                                    'Everyone can read posts'),
    ('ideas',                    'Signed-in users can read ideas',                                    'Everyone can read ideas'),
    ('opportunities',            'Live opportunities are visible; submitters see their own; admin',   'Live opportunities are visible; submitters see their own; admin'),
    ('opportunity_participants', 'Signed-in users can see who is looking',                            'Everyone can see who is looking'),
    ('teams',                    'Signed-in users can read teams',                                    'Everyone can read teams'),
    ('team_applications',        'Members are visible; applicants and owners see the rest',           'Members are visible; applicants and owners see the rest'),
    ('projects',                 'Signed-in users can read projects',                                 'Everyone can read projects'),
    ('experiences',              'Signed-in users can read experience',                               'Everyone can read experience'),
    ('awards',                   'Signed-in users can read awards',                                   'Everyone can read awards'),
    ('award_teammates',          'Confirmed teammates are visible; the tagged person and the owne',   'Confirmed teammates are visible; the tagged person and the owne')
  ) as t(tbl, old_name, new_name) loop
    -- The second run finds the policy under its new name
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = p.tbl and policyname = p.old_name) then
      execute format('alter policy %I on %I to anon, authenticated', p.old_name, p.tbl);
      if p.old_name <> p.new_name then
        execute format('alter policy %I on %I rename to %I', p.old_name, p.tbl, p.new_name);
      end if;
    end if;
  end loop;
end;
$$;

-- profiles is readable column by column (contact.sql); anon gets the same columns as signed-in users,
-- never telegram or email
do $$
begin
  execute format(
    'grant select (%s) on profiles to anon',
    (select string_agg(quote_ident(column_name), ', ')
       from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles'
        and column_name not in ('telegram', 'email'))
  );
end;
$$;

-- Profile pages list someone's accepted connections (connections-list.sql)
grant execute on function connections_of(uuid) to anon;

-- After the new app version is deployed, nothing creates anonymous users any more. You can then turn
-- off "Allow anonymous sign-ins" (Authentication → Sign In / Providers), and, if you like, remove the
-- old guest accounts and their empty profiles (guests could never write, so nothing else goes with them):
--   delete from auth.users where is_anonymous;
