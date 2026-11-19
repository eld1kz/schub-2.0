-- You can delete your own images. Run once in Supabase Dashboard → SQL Editor, after display-name.sql.
-- Safe to run twice.
-- Storage has to find a file before it deletes it, which needs a select policy. There was none, so the
-- "Users delete their own images" policy (portfolio.sql) never took effect and replaced photos stayed
-- public for good. This lets you see (list) only your own folder; the bucket is still public, so image
-- links keep working for everyone. The app now deletes the old image when a photo is replaced.

drop policy if exists "Users see their own images" on storage.objects;
create policy "Users see their own images"
  on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
