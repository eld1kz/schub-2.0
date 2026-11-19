-- display_name() only for signed-in users. Run once in Supabase Dashboard → SQL Editor, after
-- participant-notes.sql. Safe to run twice.
-- It's security definer and was executable by anon, so anyone with the public key could turn a profile
-- id into a name without signing in. The notification triggers that use it run as its owner, so they
-- keep working.

revoke execute on function display_name(uuid) from public, anon;
grant execute on function display_name(uuid) to authenticated;
