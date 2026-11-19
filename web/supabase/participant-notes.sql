-- "Looking for a team": you can edit your note. Run once in Supabase Dashboard → SQL Editor, after
-- notification-limits.sql. Safe to run twice.
-- lookForTeam saves with an upsert, which updates the row when you've already joined. There was no
-- update policy, so changing your note always failed with "Couldn't save it". Only your own row, and it
-- stays yours. Guests are already blocked by the restrictive policies in auth.sql.

drop policy if exists "Users edit their own note" on opportunity_participants;
create policy "Users edit their own note"
  on opportunity_participants for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
