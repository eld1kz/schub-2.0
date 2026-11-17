-- Google sign-in. Run once in Supabase Dashboard → SQL Editor, after connections-list.sql.
-- Visitors still get an anonymous guest account so they can browse; only people signed in
-- with Google can write. These are new restrictive policies: every existing policy stays as
-- it is, and a write now has to pass both the old policy and this one.

create or replace function is_guest()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'projects', 'experiences', 'connections', 'posts', 'ideas', 'opportunities',
    'opportunity_reports', 'opportunity_participants', 'teams', 'team_applications'
  ] loop
    execute format('create policy "Guests can''t add" on %I as restrictive for insert to authenticated with check (not is_guest())', t);
    execute format('create policy "Guests can''t edit" on %I as restrictive for update to authenticated using (not is_guest())', t);
    execute format('create policy "Guests can''t delete" on %I as restrictive for delete to authenticated using (not is_guest())', t);
  end loop;
end;
$$;

create policy "Guests can't upload" on storage.objects
  as restrictive for insert to authenticated with check (not public.is_guest());

create policy "Guests can't delete files" on storage.objects
  as restrictive for delete to authenticated using (not public.is_guest());
